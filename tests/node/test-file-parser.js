import {test} from 'tape-six';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {none} from 'stream-chain/defs.js';
import pipe from 'stream-chain/utils/pipe.js';
import drain from 'stream-chain/utils/drain.js';
import Assembler from 'stream-json/assembler.js';

import parseFile, {parser as parseFileAlias} from '../../src/file/parser.js';

const inTempDir = async fn => {
  const dir = await mkdtemp(join(tmpdir(), 'scsv-file-parser-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
};

const rowsOf = async (path, options) => {
  const rows = [];
  const asm = new Assembler();
  await drain(
    pipe(parseFile(options), token => {
      asm[token.name] && asm[token.name](token.value);
      if (asm.done) rows.push(asm.current);
      return none;
    })(path)
  );
  return rows;
};

test('file: parseFile alias export', t => {
  t.equal(typeof parseFile, 'function');
  t.equal(parseFileAlias, parseFile);
});

test.asPromise('parseFile: parses a CSV file into rows', async (t, resolve, reject) => {
  try {
    await inTempDir(async dir => {
      const path = join(dir, 'sample.csv');
      await writeFile(path, 'a,b,c\r\n1,2,3\r\n4,5,6\r\n');
      const rows = await rowsOf(path);
      t.deepEqual(rows, [
        ['a', 'b', 'c'],
        ['1', '2', '3'],
        ['4', '5', '6']
      ]);
    });
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('parseFile: tiny readBlockSize exercises cross-block + UTF-8', async (t, resolve, reject) => {
  try {
    await inTempDir(async dir => {
      const path = join(dir, 'utf8.csv');
      await writeFile(path, 'name,emoji\r\nrocket,🚀\r\nsnowman,☃\r\n');
      const rows = await rowsOf(path, {readBlockSize: 3});
      t.deepEqual(rows, [
        ['name', 'emoji'],
        ['rocket', '🚀'],
        ['snowman', '☃']
      ]);
    });
    resolve();
  } catch (e) {
    reject(e);
  }
});
