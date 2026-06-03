// Web-substrate mirror of tests/node/test-parser.js (minus the fs/zlib gzip
// sample test, which is Node-only). Imports nothing from `node:*` — drives the
// parser through `stream-chain/web` and the browser-safe Web Streams helpers.

import test from 'tape-six';
import {chain} from 'stream-chain/web';

import parser from '../../src/web/parser.js';
import Assembler from 'stream-json/web/assembler.js';

import {readWebString, drain} from '../web-helpers.js';

const assemble = tokens => {
  const asm = new Assembler();
  const result = [];
  for (const token of tokens) {
    asm[token.name] && asm[token.name](token.value);
    if (asm.done) result.push(asm.current);
  }
  return result;
};

test.asPromise('parser (web): low-level tokens', async (t, resolve, reject) => {
  try {
    const input = ',x,\r\n"""\r\n"';
    const expected = [
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
    const out = await drain(chain([readWebString(input), parser()]));
    // Map to fresh objects: structural tokens are singletons, which deep6.equal reports as Circular.
    t.deepEqual(
      out.map(token => ('value' in token ? {name: token.name, value: token.value} : {name: token.name})),
      expected
    );
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): simple rows', async (t, resolve, reject) => {
  try {
    const input = '1,,"",""""\r\n2,three,"four",five\r\n';
    const out = await drain(chain([readWebString(input), parser()]));
    t.deepEqual(assemble(out), [
      ['1', '', '', '"'],
      ['2', 'three', 'four', 'five']
    ]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): custom separator', async (t, resolve, reject) => {
  try {
    const input = '1||""|"""|"\r\n2|three|"four\r\n"|five\r\n';
    const out = await drain(chain([readWebString(input), parser({separator: '|'})]));
    t.deepEqual(assemble(out), [
      ['1', '', '', '"|'],
      ['2', 'three', 'four\r\n', 'five']
    ]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): pack-only (no streaming)', async (t, resolve, reject) => {
  try {
    const out = await drain(chain([readWebString('a,b\r\n1,2\r\n'), parser({streamStrings: false})]));
    const names = out.map(token => token.name);
    t.ok(!names.includes('startString'));
    t.ok(!names.includes('stringChunk'));
    t.ok(names.includes('stringValue'));
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): stream-only (no packing)', async (t, resolve, reject) => {
  try {
    const out = await drain(chain([readWebString('a,b\r\n1,2\r\n'), parser({packStrings: false})]));
    const names = out.map(token => token.name);
    t.ok(names.includes('startString'));
    t.ok(names.includes('stringChunk'));
    t.ok(!names.includes('stringValue'));
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): flush with trailing value', async (t, resolve, reject) => {
  try {
    const out = await drain(chain([readWebString('a,b'), parser()]));
    const names = out.map(token => token.name);
    t.ok(names.includes('startArray'));
    t.ok(names.includes('endArray'));
    t.equal(out.filter(token => token.name === 'stringValue').length, 2);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): empty input', async (t, resolve, reject) => {
  try {
    const out = await drain(chain([readWebString(''), parser()]));
    t.equal(out.length, 0);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): blank line between rows emits empty array row', async (t, resolve, reject) => {
  try {
    const out = await drain(chain([readWebString('a,b\r\n\r\nc,d\r\n'), parser()]));
    t.deepEqual(assemble(out), [['a', 'b'], [], ['c', 'd']]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): bare \\r\\n alone emits one empty array', async (t, resolve, reject) => {
  try {
    const out = await drain(chain([readWebString('\r\n'), parser()]));
    t.deepEqual(assemble(out), [[]]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): header longer than data row', async (t, resolve, reject) => {
  try {
    const out = await drain(chain([readWebString('a,b,c\r\n1,2\r\n'), parser()]));
    t.deepEqual(assemble(out), [
      ['a', 'b', 'c'],
      ['1', '2']
    ]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): strips leading UTF-8 BOM', async (t, resolve, reject) => {
  try {
    const out = await drain(chain([readWebString('﻿a,b\r\n1,2\r\n'), parser()]));
    t.deepEqual(assemble(out), [
      ['a', 'b'],
      ['1', '2']
    ]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): throws on character after closing quote', async (t, resolve, reject) => {
  try {
    await drain(chain([readWebString('"a"b,c\r\n'), parser()]));
    t.fail('expected an error');
    reject(new Error('expected an error'));
  } catch (e) {
    t.ok(/unexpected character after a quoted value/.test(e.message));
    resolve();
  }
});

test.asPromise('parser (web): throws on unterminated quoted value', async (t, resolve, reject) => {
  try {
    await drain(chain([readWebString('"abc'), parser()]));
    t.fail('expected an error');
    reject(new Error('expected an error'));
  } catch (e) {
    t.ok(/expected a quoted value/.test(e.message));
    resolve();
  }
});

test.asPromise('parser (web): mixed CRLF / LF / bare CR row terminators', async (t, resolve, reject) => {
  try {
    const out = await drain(chain([readWebString('a,b\r\nc,d\ne,f\rg,h\r\n'), parser()]));
    t.deepEqual(assemble(out), [
      ['a', 'b'],
      ['c', 'd'],
      ['e', 'f'],
      ['g', 'h']
    ]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parser (web): regex-special separator (period)', async (t, resolve, reject) => {
  try {
    const out = await drain(chain([readWebString('a.b.c\r\n1.2.3\r\n'), parser({separator: '.'})]));
    t.deepEqual(assemble(out), [
      ['a', 'b', 'c'],
      ['1', '2', '3']
    ]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

const runSlidingWindowTest = quant =>
  test.asPromise('parser (web): sliding window quant=' + quant, async (t, resolve, reject) => {
    try {
      const table = [
        ['1', '', '', '"'],
        ['2', 'three', 'four', 'five']
      ];
      const input = table.map(row => row.map(value => (/[,\r\n"]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value)).join(',')).join('\r\n');
      const out = await drain(chain([readWebString(input, quant), parser()]));
      t.deepEqual(assemble(out), table);
      resolve();
    } catch (e) {
      reject(e);
    }
  });

for (let i = 1; i <= 12; ++i) runSlidingWindowTest(i);
