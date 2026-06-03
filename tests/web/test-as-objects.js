// Web-substrate mirror of tests/node/test-as-objects.js. Browser-safe: no `node:*`.

import test from 'tape-six';
import {chain} from 'stream-chain/web';

import parser from '../../src/web/parser.js';
import asObjects from '../../src/web/as-objects.js';
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

test.asPromise('as-objects (web): simple', async (t, resolve, reject) => {
  try {
    const input = 'alpha,beta,gamma\r\n1,,"",""""\r\n2,three,"four",five\r\n';
    const out = await drain(chain([readWebString(input), parser(), asObjects()]));
    t.deepEqual(assemble(out), [
      {alpha: '1', beta: '', gamma: '', field3: '"'},
      {alpha: '2', beta: 'three', gamma: 'four', field3: 'five'}
    ]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('as-objects (web): header captures from packed-only parser (streamStrings: false)', async (t, resolve, reject) => {
  try {
    const input = 'alpha,beta,gamma\r\n1,,"",""""\r\n2,three,"four",five\r\n';
    const out = await drain(chain([readWebString(input), parser({streamStrings: false}), asObjects()]));
    t.deepEqual(assemble(out), [
      {alpha: '1', beta: '', gamma: '', field3: '"'},
      {alpha: '2', beta: 'three', gamma: 'four', field3: 'five'}
    ]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('as-objects (web): custom fieldPrefix', async (t, resolve, reject) => {
  try {
    const input = 'alpha,,gamma\r\n1,,"",""""\r\n2,three,"four",five\r\n';
    const out = await drain(chain([readWebString(input), parser({useValues: true}), asObjects({fieldPrefix: 'column'})]));
    t.deepEqual(assemble(out), [
      {alpha: '1', column1: '', gamma: '', column3: '"'},
      {alpha: '2', column1: 'three', gamma: 'four', column3: 'five'}
    ]);
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('as-objects (web): withParser pipeline', async (t, resolve, reject) => {
  try {
    const out = await drain(chain([readWebString('a,b\r\n1,2\r\n'), asObjects.withParser()]));
    t.deepEqual(assemble(out), [{a: '1', b: '2'}]);
    resolve();
  } catch (e) {
    reject(e);
  }
});
