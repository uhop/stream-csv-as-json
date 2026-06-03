import fs from 'node:fs';
import zlib from 'node:zlib';

import test from 'tape-six';
import chain from 'stream-chain';

import parser from '../../src/parser.js';
import Assembler from 'stream-json/assembler.js';

import {readString} from '../helpers.js';

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

  // Map to fresh objects: structural tokens are module-level singletons, and
  // deep6.equal (circular: true) reports reused references as Circular mismatches.
  pipeline.on('data', token => result.push('value' in token ? {name: token.name, value: token.value} : {name: token.name}));
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
  const samplePath = new URL('../data/sample.csv.gz', import.meta.url);

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
        if (/[\r\n]/.test(value)) ++valuesWithCrLf;
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

test.asPromise('parser: blank line between rows emits empty array row', (t, resolve, reject) => {
  const input = 'a,b\r\n\r\nc,d\r\n',
    result = [];

  const pipeline = chain([readString(input), parser()]);
  const asm = new Assembler();

  pipeline.on('data', token => {
    asm[token.name] && asm[token.name](token.value);
    if (asm.done) result.push(asm.current);
  });
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, [['a', 'b'], [], ['c', 'd']]);
    resolve();
  });
});

test.asPromise('parser: bare \\r\\n alone emits one empty array', (t, resolve, reject) => {
  const input = '\r\n',
    result = [];

  const pipeline = chain([readString(input), parser()]);
  const asm = new Assembler();

  pipeline.on('data', token => {
    asm[token.name] && asm[token.name](token.value);
    if (asm.done) result.push(asm.current);
  });
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, [[]]);
    resolve();
  });
});

test.asPromise('parser: header longer than data row', (t, resolve, reject) => {
  const input = 'a,b,c\r\n1,2\r\n',
    result = [];

  const pipeline = chain([readString(input), parser()]);
  const asm = new Assembler();

  pipeline.on('data', token => {
    asm[token.name] && asm[token.name](token.value);
    if (asm.done) result.push(asm.current);
  });
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, [
      ['a', 'b', 'c'],
      ['1', '2']
    ]);
    resolve();
  });
});

test.asPromise('parser: strips leading UTF-8 BOM', (t, resolve, reject) => {
  const input = '﻿a,b\r\n1,2\r\n',
    result = [];

  const pipeline = chain([readString(input), parser()]);
  const asm = new Assembler();

  pipeline.on('data', token => {
    asm[token.name] && asm[token.name](token.value);
    if (asm.done) result.push(asm.current);
  });
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, [
      ['a', 'b'],
      ['1', '2']
    ]);
    resolve();
  });
});

test.asPromise('parser: throws on character after closing quote', (t, resolve, reject) => {
  const input = '"a"b,c\r\n';

  const pipeline = chain([readString(input), parser()]);

  pipeline.on('data', () => {});
  pipeline.on('error', err => {
    t.ok(/unexpected character after a quoted value/.test(err.message), 'error mentions unexpected char');
    resolve();
  });
  pipeline.on('end', () => reject(new Error('expected an error, got end')));
});

test.asPromise('parser: throws on unterminated quoted value', (t, resolve, reject) => {
  const input = '"abc';

  const pipeline = chain([readString(input), parser()]);

  pipeline.on('data', () => {});
  pipeline.on('error', err => {
    t.ok(/expected a quoted value/.test(err.message), 'error mentions expected quoted value');
    resolve();
  });
  pipeline.on('end', () => reject(new Error('expected an error, got end')));
});

test.asPromise('parser: mixed CRLF / LF / bare CR row terminators', (t, resolve, reject) => {
  const input = 'a,b\r\nc,d\ne,f\rg,h\r\n',
    result = [];

  const pipeline = chain([readString(input), parser()]);
  const asm = new Assembler();

  pipeline.on('data', token => {
    asm[token.name] && asm[token.name](token.value);
    if (asm.done) result.push(asm.current);
  });
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, [
      ['a', 'b'],
      ['c', 'd'],
      ['e', 'f'],
      ['g', 'h']
    ]);
    resolve();
  });
});

test.asPromise('parser: regex-special separator (period)', (t, resolve, reject) => {
  const input = 'a.b.c\r\n1.2.3\r\n',
    result = [];

  const pipeline = chain([readString(input), parser({separator: '.'})]);
  const asm = new Assembler();

  pipeline.on('data', token => {
    asm[token.name] && asm[token.name](token.value);
    if (asm.done) result.push(asm.current);
  });
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, [
      ['a', 'b', 'c'],
      ['1', '2', '3']
    ]);
    resolve();
  });
});
