import {test} from 'tape-six';
import {open, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pipeline, Readable} from 'node:stream';

import chain from 'stream-chain';
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

// FileHandle's write lives on the prototype, so a patch there sees the handle a sink
// opens; close is an own property, so it is wrapped on that handle to signal the release.
const watchHandle = async () => {
  const probe = await open('/dev/null', 'w');
  const proto = Object.getPrototypeOf(probe);
  await probe.close();
  const write = proto.write;
  const watch = {handle: null, released: null};
  let signal;
  watch.released = new Promise(resolve => (signal = resolve));
  proto.write = function (...args) {
    if (!watch.handle) {
      watch.handle = this;
      const close = this.close;
      this.close = (...a) => close.apply(this, a).finally(signal);
    }
    return write.apply(this, args);
  };
  watch.restore = () => (proto.write = write);
  return watch;
};

test('stringerToFile: close() releases the file handle', async t => {
  await inTempDir(async dir => {
    const sink = stringerToFile(join(dir, 'close.csv'), {writeBlockSize: 1});
    const watch = await watchHandle();
    try {
      for await (const _ of sink({name: 'startArray'}));
      for await (const _ of sink({name: 'startString'}));
    } finally {
      watch.restore();
    }
    t.ok(watch.handle, 'a block write opened the file');
    t.notEqual(watch.handle?.fd, -1, 'the handle stays open between blocks');
    await sink.close();
    t.equal(watch.handle?.fd, -1, 'close() released the handle');
    await t.rejects(
      (async () => {
        for await (const _ of sink({name: 'endString'}));
      })(),
      'a call after close() throws'
    );
  });
});

test('stringerToFile: a torn-down chain releases the file handle without close()', async t => {
  await inTempDir(async dir => {
    const sourceErr = new Error('source boom');
    const watch = await watchHandle();
    let caught;
    try {
      caught = await new Promise(done => {
        const c = chain([
          function* () {
            yield {name: 'startArray'};
            yield {name: 'startString'};
            throw sourceErr;
          },
          stringerToFile(join(dir, 'abort.csv'), {writeBlockSize: 1})
        ]);
        pipeline(Readable.from([0]), c, done);
      });
      if (watch.handle) {
        // on Node and Bun the release follows pipeline()'s callback; the timer caps a missing one
        let timer;
        await Promise.race([watch.released, new Promise(r => (timer = setTimeout(r, 1000)))]);
        clearTimeout(timer);
      }
    } finally {
      watch.restore();
    }
    t.equal(caught, sourceErr, 'the source error reaches pipeline()');
    t.ok(watch.handle, 'a block write opened the file');
    t.equal(watch.handle?.fd, -1, 'the teardown released the handle');
  });
});
