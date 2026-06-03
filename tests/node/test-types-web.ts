// CLI type test (run by `ts-test`, not the browser) covering the `/web` entry
// `.d.ts` files: the web factories expose `.asWebStream` (no `.asStream`).

import test from 'tape-six';
import webMake from '../../src/web/index.js';
import parser from '../../src/web/parser.js';
import stringer from '../../src/web/stringer.js';
import asObjects from '../../src/web/as-objects.js';

test('types: web entries expose asWebStream', t => {
  const m: {readable: ReadableStream; writable: WritableStream} = webMake();
  t.ok(m);

  const p: {readable: ReadableStream; writable: WritableStream} = parser.asWebStream();
  t.ok(p);

  const s: {readable: ReadableStream; writable: WritableStream} = stringer.asWebStream({useValues: true});
  t.ok(s);

  const o: {readable: ReadableStream; writable: WritableStream} = asObjects.asWebStream();
  t.ok(o);

  const ow: {readable: ReadableStream; writable: WritableStream} = asObjects.withParserAsWebStream();
  t.ok(ow);

  // Web parser shares the discriminated token union.
  const token: parser.Token = {name: 'stringValue', value: 'x'};
  t.equal(token.name, 'stringValue');
});
