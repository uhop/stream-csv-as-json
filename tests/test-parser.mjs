import fs from 'node:fs';
import zlib from 'node:zlib';

import test from 'tape-six';
import chain from 'stream-chain';

import parser from '../src/parser.js';
import Assembler from 'stream-json/assembler.js';

import readString from './read-string.mjs';

test.asPromise('parser: low-level tokens', (t, resolve, reject) => {
  const input = ',x,\r\n"""\r\n"',
    result = [],
    expected = [
      {name: 'startArray'},
      {name: 'startString'},
      {name: 'endString'},
      {name: 'stringValue', value: ''},
      {name: 'startString'},
      {name: 'stringChunk', value: 'x'},
      {name: 'endString'},
      {name: 'stringValue', value: 'x'},
      {name: 'startString'},
      {name: 'endString'},
      {name: 'stringValue', value: ''},
      {name: 'endArray'},
      {name: 'startArray'},
      {name: 'startString'},
      {name: 'stringChunk', value: '"'},
      {name: 'stringChunk', value: '\r\n'},
      {name: 'endString'},
      {name: 'stringValue', value: '"\r\n'},
      {name: 'endArray'}
    ];

  const pipeline = chain([readString(input), parser()]);

  pipeline.on('data', token => result.push(token));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('parser: simple rows', (t, resolve, reject) => {
  const input = '1,,"",""""\r\n2,three,"four",five\r\n',
    expected = [
      ['1', '', '', '"'],
      ['2', 'three', 'four', 'five']
    ],
    result = [];

  const pipeline = chain([readString(input), parser()]);
  const asm = new Assembler();

  pipeline.on('data', token => {
    asm[token.name] && asm[token.name](token.value);
    if (asm.done) result.push(asm.current);
  });
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('parser: tricky values from gzipped sample', (t, resolve, reject) => {
  const samplePath = new URL('./sample.csv.gz', import.meta.url);

  const pipeline = chain([fs.createReadStream(samplePath), zlib.createGunzip(), parser.asStream()]);

  let rows = 0,
    empties = 0,
    valuesWithCrLf = 0,
    valuesWithDoubleQuote = 0;
  pipeline.on('data', data => {
    if (data.name === 'startArray') {
      ++rows;
      return;
    }
    if (data.name === 'stringValue') {
      const value = data.value;
      if (value) {
        if (/[\u000A\u000D]/.test(value)) {
          ++valuesWithCrLf;
        }
        if (/"/.test(value)) {
          ++valuesWithDoubleQuote;
        }
      } else {
        ++empties;
      }
    }
  });
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.equal(rows, 18126);
    t.equal(empties, 159203);
    t.equal(valuesWithCrLf, 1);
    t.equal(valuesWithDoubleQuote, 1);
    resolve();
  });
});

test.asPromise('parser: custom separator', (t, resolve, reject) => {
  const input = '1||""|"""|"\r\n2|three|"four\r\n"|five\r\n',
    expected = [
      ['1', '', '', '"|'],
      ['2', 'three', 'four\r\n', 'five']
    ],
    result = [];

  const pipeline = chain([readString(input), parser({separator: '|'})]);
  const asm = new Assembler();

  pipeline.on('data', token => {
    asm[token.name] && asm[token.name](token.value);
    if (asm.done) result.push(asm.current);
  });
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('parser: pack-only (no streaming)', (t, resolve, reject) => {
  const input = 'a,b\r\n1,2\r\n',
    result = [];

  const pipeline = chain([readString(input), parser({streamStrings: false})]);

  pipeline.on('data', token => result.push(token));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    const names = result.map(t => t.name);
    t.ok(!names.includes('startString'));
    t.ok(!names.includes('endString'));
    t.ok(!names.includes('stringChunk'));
    t.ok(names.includes('stringValue'));
    resolve();
  });
});

test.asPromise('parser: stream-only (no packing)', (t, resolve, reject) => {
  const input = 'a,b\r\n1,2\r\n',
    result = [];

  const pipeline = chain([readString(input), parser({packStrings: false})]);

  pipeline.on('data', token => result.push(token));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    const names = result.map(t => t.name);
    t.ok(names.includes('startString'));
    t.ok(names.includes('endString'));
    t.ok(names.includes('stringChunk'));
    t.ok(!names.includes('stringValue'));
    resolve();
  });
});

test.asPromise('parser: flush with trailing value', (t, resolve, reject) => {
  const input = 'a,b',
    result = [];

  const pipeline = chain([readString(input), parser()]);

  pipeline.on('data', token => result.push(token));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    const names = result.map(t => t.name);
    t.ok(names.includes('startArray'));
    t.ok(names.includes('endArray'));
    t.equal(result.filter(t => t.name === 'stringValue').length, 2);
    resolve();
  });
});

test.asPromise('parser: empty input', (t, resolve, reject) => {
  const input = '',
    result = [];

  const pipeline = chain([readString(input), parser()]);

  pipeline.on('data', token => result.push(token));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.equal(result.length, 0);
    resolve();
  });
});
