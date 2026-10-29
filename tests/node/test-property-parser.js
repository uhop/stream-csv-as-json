import test from 'tape-six';
import fc from 'fast-check';
import 'tape-six-fast-check';
import {Readable} from 'node:stream';

import chain from 'stream-chain';
import {getManyValues, none} from 'stream-chain/core';

import {parser, csvParser} from '../../src/parser.js';
import stringer from '../../src/stringer.js';

const BOM = String.fromCharCode(0xfeff);

const isHigh = code => code >= 0xd800 && code <= 0xdbff;
const isLow = code => code >= 0xdc00 && code <= 0xdfff;
const endsHigh = s => isHigh(s.charCodeAt(s.length - 1));
const splitsPair = strings => strings.some((s, i) => i + 1 < strings.length && endsHigh(s) && isLow(strings[i + 1].charCodeAt(0)));

const special = fc.constantFrom('a', 'b', ' ', ',', ';', '|', '\t', '"', '\r', '\n', BOM);
const anyCodePoint = fc.string({unit: 'binary', minLength: 1, maxLength: 1});
const loneHalf = fc.integer({min: 0xd800, max: 0xdfff}).map(code => String.fromCharCode(code));

const fieldOf = unit => fc.string({unit, maxLength: 12});
const wellFormedUnit = fc.oneof({weight: 4, arbitrary: special}, {weight: 2, arbitrary: anyCodePoint});
const anyUnit = fc.oneof({weight: 4, arbitrary: special}, {weight: 2, arbitrary: anyCodePoint}, {weight: 1, arbitrary: loneHalf});

const rowsOf = field => fc.array(fc.array(field, {maxLength: 5}), {minLength: 1, maxLength: 6});
const separators = fc.constantFrom(',', ';', '\t', '|', '||');
const terminators = fc.constantFrom('\r\n', '\n', '\r');
const sizes = fc.array(fc.integer({min: 1, max: 24}), {minLength: 1, maxLength: 8});

// quoted only where an unquoted field would be ambiguous: the separator would start before the field ends
const needsQuotes = (field, row, separator) =>
  field === '' ? row.length === 1 : /["\r\n]/.test(field) || field.charCodeAt(0) === 0xfeff || (field + separator).indexOf(separator) < field.length;

const serialize = (rows, separator, terminator) =>
  rows.map(row => row.map(field => (needsQuotes(field, row, separator) ? '"' + field.replace(/"/g, '""') + '"' : field)).join(separator) + terminator).join('');

const cut = (text, lengths) => {
  const chunks = [];
  for (let i = 0, k = 0; i < text.length; ++k) {
    const n = lengths[k % lengths.length];
    chunks.push(text.slice(i, i + n));
    i += n;
  }
  return chunks;
};

const tokensOf = (chunks, options) => {
  const parse = csvParser(options),
    tokens = [];
  for (const chunk of [...chunks, none]) {
    const result = parse(chunk);
    if (result !== none) tokens.push(...getManyValues(result));
  }
  return tokens;
};

const tokensOfBytes = (chunks, options) =>
  new Promise((resolve, reject) => {
    const tokens = [],
      c = chain([Readable.from(chunks), parser(options)]);
    c.on('data', token => tokens.push(token));
    c.on('error', reject);
    c.on('end', () => resolve(tokens));
  });

// rows from the packed values; also checks every field's chunks against its packed value
const rowsFrom = tokens => {
  const rows = [];
  let row = null,
    chunks = null;
  for (const token of tokens) {
    switch (token.name) {
      case 'startArray':
        rows.push((row = []));
        break;
      case 'startString':
        chunks = [];
        break;
      case 'stringChunk':
        chunks.push(token.value);
        break;
      case 'endString':
        if (splitsPair(chunks)) throw new Error('a surrogate pair is split between two stringChunk tokens');
        break;
      case 'stringValue':
        if (chunks && chunks.join('') !== token.value) throw new Error('the chunks do not join to the packed value');
        row.push(token.value);
        chunks = null;
        break;
    }
  }
  return rows;
};

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

test('property: string chunks split anywhere parse to the same rows', async t => {
  await t.prop(
    [rowsOf(fieldOf(anyUnit)), separators, terminators, sizes],
    (rows, separator, terminator, lengths) => same(rowsFrom(tokensOf(cut(serialize(rows, separator, terminator), lengths), {separator})), rows),
    {numRuns: 300}
  );
});

test('property: UTF-8 bytes split anywhere parse to the same rows, dropping one BOM', async t => {
  await t.prop(
    [rowsOf(fieldOf(wellFormedUnit)), separators, terminators, sizes, fc.boolean()],
    async (rows, separator, terminator, lengths, bom) => {
      const bytes = Buffer.from((bom ? BOM : '') + serialize(rows, separator, terminator)),
        chunks = [];
      for (let i = 0, k = 0; i < bytes.length; ++k) {
        const n = lengths[k % lengths.length];
        chunks.push(bytes.subarray(i, i + n));
        i += n;
      }
      return same(rowsFrom(await tokensOfBytes(chunks, {separator})), rows);
    },
    {numRuns: 200}
  );
});

const rowTokens = (rows, lengths) => {
  const tokens = [];
  let k = 0;
  for (const row of rows) {
    tokens.push({name: 'startArray'});
    for (const field of row) {
      tokens.push({name: 'startString'});
      for (let i = 0; i < field.length; ++k) {
        const n = lengths[k % lengths.length];
        tokens.push({name: 'stringChunk', value: field.slice(i, i + n)});
        i += n;
      }
      tokens.push({name: 'endString'}, {name: 'stringValue', value: field});
    }
    tokens.push({name: 'endArray'});
  }
  return tokens;
};

test('property: the stringer round-trips rows, and each output string encodes alone', async t => {
  await t.prop(
    [rowsOf(fieldOf(wellFormedUnit)), separators, sizes, fc.boolean()],
    (rows, separator, lengths, useValues) => {
      const write = stringer({separator, useValues}),
        out = [];
      for (const token of [...rowTokens(rows, lengths), none]) {
        const result = write(token);
        if (result !== none) out.push(result);
      }
      if (!Buffer.concat(out.map(s => Buffer.from(s))).equals(Buffer.from(out.join('')))) return false;
      return same(rowsFrom(tokensOf([out.join('')], {separator})), rows);
    },
    {numRuns: 300}
  );
});
