import test from 'tape-six';
import chain from 'stream-chain';

import parser from '../src/parser.js';
import stringer from '../src/stringer.js';

import readString from './read-string.mjs';

const toCsv = array => array.map(row => row.map(value => (/[,\r\n"]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value)).join(',')).join('\r\n');

const collect = pipeline =>
  new Promise((resolve, reject) => {
    let result = '';
    pipeline.on('data', data => (result += data));
    pipeline.on('error', reject);
    pipeline.on('end', () => resolve(result));
  });

test.asPromise('stringer: simple round-trip', async (t, resolve, reject) => {
  const table = [
    ['1', '', '', '"'],
    ['2', 'three', 'four', 'five']
  ];
  const expected = '"1","","",""""\r\n"2","three","four","five"\r\n';

  const pipeline = chain([readString(toCsv(table)), parser(), stringer()]);
  const result = await collect(pipeline);
  t.equal(result, expected);
  resolve();
});

test.asPromise('stringer: quoted values', async (t, resolve, reject) => {
  const table = [
    ['1', ',', '', '"'],
    ['2', 'three\r\n', 'four', 'five']
  ];
  const expected = '"1",",","",""""\r\n"2","three\r\n","four","five"\r\n';

  const pipeline = chain([readString(toCsv(table)), parser(), stringer()]);
  const result = await collect(pipeline);
  t.equal(result, expected);
  resolve();
});

test.asPromise('stringer: useValues mode', async (t, resolve, reject) => {
  const table = [
    ['1', '', '', '"'],
    ['2', 'three', 'four', 'five']
  ];
  const expected = '1,,,""""\r\n2,three,four,five\r\n';

  const pipeline = chain([readString(toCsv(table)), parser(), stringer({useValues: true})]);
  const result = await collect(pipeline);
  t.equal(result, expected);
  resolve();
});

test.asPromise('stringer: useValues quoted', async (t, resolve, reject) => {
  const table = [
    ['1', ',', '', '"'],
    ['2', 'three\r\n', 'four', 'five']
  ];
  const expected = '1,",",,""""\r\n2,"three\r\n",four,five\r\n';

  const pipeline = chain([readString(toCsv(table)), parser(), stringer({useValues: true})]);
  const result = await collect(pipeline);
  t.equal(result, expected);
  resolve();
});

test.asPromise('stringer: custom separator (pipe)', async (t, resolve, reject) => {
  const table = [
    ['1', '|', '', '"'],
    ['2', 'three\r\n', 'four', 'five']
  ];
  const expected = '"1"|"|"|""|""""\r\n"2"|"three\r\n"|"four"|"five"\r\n';

  const pipeline = chain([readString(toCsv(table)), parser(), stringer({separator: '|'})]);
  const result = await collect(pipeline);
  t.equal(result, expected);
  resolve();
});

test.asPromise('stringer: useValues custom separator (pipe)', async (t, resolve, reject) => {
  const table = [
    ['1', '|', '', '"'],
    ['2', 'three\r\n', 'four', 'five']
  ];
  const expected = '1|"|"||""""\r\n2|"three\r\n"|four|five\r\n';

  const pipeline = chain([readString(toCsv(table)), parser(), stringer({useValues: true, separator: '|'})]);
  const result = await collect(pipeline);
  t.equal(result, expected);
  resolve();
});

test.asPromise('stringer: useValues tab separator', async (t, resolve, reject) => {
  const table = [
    ['1', '\t', '', '"', ''],
    ['2', 'three\r\n', 'four', 'five']
  ];
  const expected = '1\t"\t"\t\t""""\t\r\n2\t"three\r\n"\tfour\tfive\r\n';

  const pipeline = chain([readString(toCsv(table)), parser(), stringer({useValues: true, separator: '\t'})]);
  const result = await collect(pipeline);
  t.equal(result, expected);
  resolve();
});
