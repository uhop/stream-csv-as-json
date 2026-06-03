import type {Duplex} from 'node:stream';

import test from 'tape-six';
import {make, parser as indexParser} from '../../src/index.js';
import parser from '../../src/parser.js';

test('types: index (make)', t => {
  const mainStream: Duplex = make();
  t.ok(mainStream);

  const mainStreamOpts: Duplex = make({packValues: true});
  t.ok(mainStreamOpts);

  // The index re-exports the parser factory as a named export.
  t.equal(indexParser, parser);
});
