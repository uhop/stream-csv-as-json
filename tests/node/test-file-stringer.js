import {test} from 'tape-six';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import pipe from 'stream-chain/utils/pipe.js';
import drain from 'stream-chain/utils/drain.js';

import parseFile from '../../src/file/parser.js';
import stringerToFile, {stringer as stringerToFileAlias} from '../../src/file/stringer.js';

const inTempDir = async fn => {
  const dir = await mkdtemp(join(tmpdir(), 'scsv-file-stringer-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
};

test('file: stringerToFile alias export', t => {
  t.equal(typeof stringerToFile, 'function');
  t.equal(stringerToFileAlias, stringerToFile);
});

test.asPromise('stringerToFile: round-trip parseFile → stringerToFile', async (t, resolve, reject) => {
  try {
    await inTempDir(async dir => {
      const src = join(dir, 'in.csv');
      const dst = join(dir, 'out.csv');
      const content = 'a,b\r\n1,2\r\n3,4\r\n';
      await writeFile(src, content);
      await drain(pipe(parseFile(), stringerToFile(dst, {useValues: true}))(src));
      const written = await readFile(dst, 'utf8');
      t.equal(written, content);
    });
    resolve();
  } catch (e) {
    reject(e);
  }
});

test.asPromise('stringerToFile: creates and closes the file on empty input', async (t, resolve, reject) => {
  try {
    await inTempDir(async dir => {
      const src = join(dir, 'empty.csv');
      const dst = join(dir, 'empty-out.csv');
      await writeFile(src, '');
      await drain(pipe(parseFile(), stringerToFile(dst, {useValues: true}))(src));
      const written = await readFile(dst, 'utf8');
      t.equal(written, '');
    });
    resolve();
  } catch (e) {
    reject(e);
  }
});
