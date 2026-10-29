import test from 'tape-six';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createWriteStream} from 'node:fs';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import chain from 'stream-chain';
import {getManyValues, none} from 'stream-chain/core';

import parser from '../../src/parser.js';
import stringer from '../../src/stringer.js';

const pair = String.fromCodePoint(0x1f600),
  high = pair.charAt(0),
  low = pair.charAt(1);

const endsHigh = s => {
  const c = s.charCodeAt(s.length - 1);
  return c >= 0xd800 && c <= 0xdbff;
};

const tokensOf = (chunks, options) =>
  new Promise((resolve, reject) => {
    const tokens = [],
      c = chain([Readable.from(chunks), parser(options)]);
    c.on('data', token => tokens.push(token));
    c.on('error', reject);
    c.on('end', () => resolve(tokens));
  });

// the stringChunk values of each field, in order
const fields = tokens => {
  const result = [];
  let current = null;
  for (const token of tokens) {
    if (token.name === 'startString') result.push((current = []));
    else if (token.name === 'stringChunk') current.push(token.value);
  }
  return result;
};

const values = tokens => tokens.filter(token => token.name === 'stringValue').map(token => token.value);

const run = 'a'.repeat(255),
  cases = [
    ['a 256-unit run ends between the halves', ['x', run + pair + 'b\r\n'], 'x' + run + pair + 'b'],
    ['a quoted 256-unit run ends between the halves', ['"x', run + pair + 'b"\r\n'], 'x' + run + pair + 'b'],
    ['the input splits the pair', ['x' + high, low + 'b\r\n'], 'x' + pair + 'b'],
    ['the input splits the pair in a quoted field', ['"x' + high, low + 'b"\r\n'], 'x' + pair + 'b'],
    ['a field opens with the pair at the end of the input', [pair, 'b\r\n'], pair + 'b']
  ];

test('parser: a surrogate pair stays whole in one stringChunk', async t => {
  for (const [title, chunks, expected] of cases) {
    const tokens = await tokensOf(chunks),
      [chunked] = fields(tokens);
    t.notOk(chunked.some(endsHigh), `${title}: no chunk ends inside the pair`);
    t.equal(chunked.join(''), expected, `${title}: the chunks join to the text`);
    t.deepEqual(values(tokens), [expected], `${title}: the packed value`);
  }
});

test('parser: a surrogate pair stays whole with a multi-character separator', async t => {
  const tokens = await tokensOf(['a||' + pair + 'b||c\r\n'], {separator: '||'});
  t.notOk(fields(tokens).flat().some(endsHigh), 'no chunk ends inside the pair');
  t.deepEqual(
    fields(tokens).map(chunks => chunks.join('')),
    ['a', pair + 'b', 'c']
  );
  t.deepEqual(values(tokens), ['a', pair + 'b', 'c']);
});

test('parser: a lone high surrogate at the end of a field is kept', async t => {
  const tokens = await tokensOf(['x' + high, ',y\r\n']);
  t.deepEqual(
    fields(tokens).map(chunks => chunks.join('')),
    ['x' + high, 'y']
  );
  t.deepEqual(values(tokens), ['x' + high, 'y']);
});

test('stringer: a pair split between stringChunk tokens stays whole in one output string', t => {
  for (const [title, chunks, expected] of [
    ['a split pair', ['x' + high, low + 'b'], '"x' + pair + 'b"\r\n'],
    ['a lone high surrogate before the closing quote', ['x' + high], '"x' + high + '"\r\n']
  ]) {
    const stringify = stringer(),
      out = [];
    const tokens = [
      {name: 'startArray'},
      {name: 'startString'},
      ...chunks.map(value => ({name: 'stringChunk', value})),
      {name: 'endString'},
      {name: 'endArray'}
    ];
    for (const token of [...tokens, none]) {
      const result = stringify(token);
      if (result !== none) out.push(...(typeof result == 'string' ? [result] : getManyValues(result)));
    }
    t.notOk(out.slice(0, -1).some(endsHigh), `${title}: no output string ends inside the pair`);
    t.equal(out.join(''), expected, `${title}: the output joins to the text`);
  }
});

test('parser → stringer → fs.WriteStream: a pair at a 256-unit boundary is written as one character', async t => {
  const field = (run + pair).repeat(64);
  for (const [kind, input] of [
    ['unquoted', field + '\r\n'],
    ['quoted', '"' + field + '"\r\n']
  ]) {
    const dir = await mkdtemp(join(tmpdir(), 'scsv-surrogates-'));
    try {
      const bytes = Buffer.from(input),
        slices = [];
      for (let i = 0; i < bytes.length; i += 4096) slices.push(bytes.subarray(i, i + 4096));
      const path = join(dir, 'out.csv');
      await pipeline(Readable.from(slices), parser.asStream(), stringer.asStream(), createWriteStream(path));
      t.deepEqual(await readFile(path), Buffer.from('"' + field + '"\r\n'), `${kind}: the file holds the text byte for byte`);
    } finally {
      await rm(dir, {recursive: true, force: true});
    }
  }
});
