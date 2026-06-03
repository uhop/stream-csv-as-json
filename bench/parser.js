// nano-bench parser benchmark. Run: `npm run bench -- bench/parser.js`
// Representative CSV (~250 KB): numeric ids, padded unquoted text, a quoted
// field with an embedded separator, a float, and a boolean-ish token per row.

import chain from 'stream-chain';
import {Readable} from 'node:stream';

import parser from '../src/parser.js';

const rows = [];
for (let i = 0; i < 4000; ++i) {
  rows.push(`${i},item-${i}-${'x'.repeat(12)},"quoted, value ${i}",${i * 1.5},${i % 2 === 0}`);
}
const csv = 'id,name,note,score,active\r\n' + rows.join('\r\n') + '\r\n';

const drain = pipeline =>
  new Promise((resolve, reject) => {
    pipeline.on('data', () => {});
    pipeline.on('end', resolve);
    pipeline.on('error', reject);
  });

export default {
  async ['parser (default: stream + pack)'](n) {
    for (let i = 0; i < n; ++i) await drain(chain([Readable.from([csv]), parser()]));
  },
  async ['parser (pack only)'](n) {
    for (let i = 0; i < n; ++i) await drain(chain([Readable.from([csv]), parser({streamStrings: false})]));
  },
  async ['parser (stream only)'](n) {
    for (let i = 0; i < n; ++i) await drain(chain([Readable.from([csv]), parser({packStrings: false})]));
  }
};
