// Web-substrate mirror of tests/node/test-stringer.js. Browser-safe: no `node:*`.

import test from 'tape-six';
import {chain} from 'stream-chain/web';

import parser from '../../src/web/parser.js';
import stringer from '../../src/web/stringer.js';

import {readWebString, drain} from '../web-helpers.js';

const toCsv = array => array.map(row => row.map(value => (/[,\r\n"]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value)).join(',')).join('\r\n');

const stringify = async (table, options) => {
  const out = await drain(chain([readWebString(toCsv(table)), parser(), stringer(options)]));
  return out.join('');
};

test.asPromise('stringer (web): simple round-trip', async (t, resolve, reject) => {
  try {
    const table = [
      ['1', '', '', '"'],
      ['2', 'three', 'four', 'five']
    ];
    t.equal(await stringify(table), '"1","","",""""\r\n"2","three","four","five"\r\n');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('stringer (web): quoted values', async (t, resolve, reject) => {
  try {
    const table = [
      ['1', ',', '', '"'],
      ['2', 'three\r\n', 'four', 'five']
    ];
    t.equal(await stringify(table), '"1",",","",""""\r\n"2","three\r\n","four","five"\r\n');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('stringer (web): useValues mode', async (t, resolve, reject) => {
  try {
    const table = [
      ['1', '', '', '"'],
      ['2', 'three', 'four', 'five']
    ];
    t.equal(await stringify(table, {useValues: true}), '1,,,""""\r\n2,three,four,five\r\n');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('stringer (web): useValues quoted', async (t, resolve, reject) => {
  try {
    const table = [
      ['1', ',', '', '"'],
      ['2', 'three\r\n', 'four', 'five']
    ];
    t.equal(await stringify(table, {useValues: true}), '1,",",,""""\r\n2,"three\r\n",four,five\r\n');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('stringer (web): custom separator (pipe)', async (t, resolve, reject) => {
  try {
    const table = [
      ['1', '|', '', '"'],
      ['2', 'three\r\n', 'four', 'five']
    ];
    t.equal(await stringify(table, {separator: '|'}), '"1"|"|"|""|""""\r\n"2"|"three\r\n"|"four"|"five"\r\n');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('stringer (web): custom rowTerminator (LF only)', async (t, resolve, reject) => {
  try {
    const table = [
      ['a', 'b'],
      ['1', '2']
    ];
    t.equal(await stringify(table, {rowTerminator: '\n'}), '"a","b"\n"1","2"\n');
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('stringer (web): useValues tab separator', async (t, resolve, reject) => {
  try {
    const table = [
      ['1', '\t', '', '"', ''],
      ['2', 'three\r\n', 'four', 'five']
    ];
    t.equal(await stringify(table, {useValues: true, separator: '\t'}), '1\t"\t"\t\t""""\t\r\n2\t"three\r\n"\tfour\tfive\r\n');
    resolve();
  } catch (e) {
    reject(e);
  }
});
