import test from 'tape-six';
import chain from 'stream-chain';

import parser from '../src/parser.js';
import Assembler from 'stream-json/assembler.js';

import readString from './read-string.mjs';

const table = [
  ['1', '', '', '"'],
  ['2', 'three', 'four', 'five']
];
const input = table.map(row => row.map(value => (/[,\r\n"]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value)).join(',')).join('\r\n');

const runSlidingWindowTest = quant =>
  test.asPromise('sliding: quant=' + quant, (t, resolve, reject) => {
    const pipeline = chain([readString(input, quant), parser()]);
    const asm = new Assembler();
    const result = [];

    pipeline.on('data', token => {
      asm[token.name] && asm[token.name](token.value);
      if (asm.done) result.push(asm.current);
    });
    pipeline.on('error', reject);
    pipeline.on('end', () => {
      t.deepEqual(result, table);
      resolve();
    });
  });

for (let i = 1; i <= 12; ++i) runSlidingWindowTest(i);
