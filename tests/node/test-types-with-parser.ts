import type {Duplex} from 'node:stream';

import test from 'tape-six';
import withParser from '../../src/utils/with-parser.js';
import asObjects from '../../src/as-objects.js';

test('types: with-parser', t => {
  const fn = withParser(asObjects, {});
  t.ok(fn);

  const s: Duplex = withParser.asStream(asObjects, {});
  t.ok(s);

  const w: {readable: ReadableStream; writable: WritableStream} = withParser.asWebStream(asObjects, {});
  t.ok(w);
});
