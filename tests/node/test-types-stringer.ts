import type {Duplex} from 'node:stream';

import test from 'tape-six';
import stringer from '../../src/stringer.js';

test('types: stringer', t => {
  const fn = stringer();
  t.equal(typeof fn, 'function');

  const s1: Duplex = stringer.asStream();
  t.ok(s1);

  const s2: Duplex = stringer.asStream({useValues: true, separator: '\t'});
  t.ok(s2);

  const s3 = stringer({useStringValues: true});
  t.equal(typeof s3, 'function');

  const s4: Duplex = stringer.asStream({rowTerminator: '\n'});
  t.ok(s4);

  const w: {readable: ReadableStream; writable: WritableStream} = stringer.asWebStream();
  t.ok(w);

  const opts: stringer.StringerOptions = {useValues: true, separator: ',', rowTerminator: '\r\n'};
  t.ok(opts);
});
