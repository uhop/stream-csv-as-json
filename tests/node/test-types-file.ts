import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import test from 'tape-six';
import parseFile from '../../src/file/parser.js';
import stringerToFile from '../../src/file/stringer.js';
import type {StringerToFile} from '../../src/file/stringer.js';

test('types: file components', async t => {
  const source = parseFile({ignoreBOM: true, readBlockSize: 4096});
  t.equal(typeof source, 'function');

  const dir = await mkdtemp(join(tmpdir(), 'scsv-types-file-'));
  try {
    const sink: StringerToFile = stringerToFile(join(dir, 'out.csv'), {useValues: true, writeBlockSize: 1024});
    t.equal(typeof sink, 'function');
    const closed: Promise<void> = sink.close();
    await closed;
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
});
