// nano-bench file-component benchmark. Run: `npm run bench -- bench/file.js`
// Same ~250 KB CSV fixture as bench/parser.js, written to a temp file. Compares
// the file-edge `parseFile` (async block reader + parser, driven by pipe/drain)
// against the manual `fs.createReadStream -> chain -> parser` path, plus a
// parse -> stringer round-trip back to disk. The file is OS-page-cached after
// the first read, so the read cost is cheap and consistent and the parser
// dominates — the comparison isolates the plumbing overhead.

import {mkdtempSync, writeFileSync, rmSync, createReadStream} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import chain from 'stream-chain';
import {none} from 'stream-chain/defs.js';
import pipe from 'stream-chain/utils/pipe.js';
import drain from 'stream-chain/utils/drain.js';

import parser from '../src/parser.js';
import parseFile from '../src/file/parser.js';
import stringerToFile from '../src/file/stringer.js';

const rows = [];
for (let i = 0; i < 4000; ++i) {
  rows.push(`${i},item-${i}-${'x'.repeat(12)},"quoted, value ${i}",${i * 1.5},${i % 2 === 0}`);
}
const csv = 'id,name,note,score,active\r\n' + rows.join('\r\n') + '\r\n';

const dir = mkdtempSync(join(tmpdir(), 'scsv-file-bench-'));
const srcPath = join(dir, 'in.csv');
writeFileSync(srcPath, csv);
process.on('exit', () => {
  try {
    rmSync(dir, {recursive: true, force: true});
  } catch {}
});

const drainStream = pipeline =>
  new Promise((resolve, reject) => {
    pipeline.on('data', () => {});
    pipeline.on('end', resolve);
    pipeline.on('error', reject);
  });

export default {
  async ['parseFile (block-reader → parser)'](n) {
    for (let i = 0; i < n; ++i) await drain(pipe(parseFile(), () => none)(srcPath));
  },
  async ['fs.createReadStream → chain → parser'](n) {
    for (let i = 0; i < n; ++i) await drainStream(chain([createReadStream(srcPath), parser()]));
  },
  async ['parseFile → stringerToFile (round-trip)'](n) {
    for (let i = 0; i < n; ++i) await drain(pipe(parseFile(), stringerToFile(join(dir, `out-${i % 4}.csv`), {useValues: true}))(srcPath));
  }
};
