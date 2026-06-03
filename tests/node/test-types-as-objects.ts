import type {Duplex} from 'node:stream';

import test from 'tape-six';
import asObjects from '../../src/as-objects.js';

test('types: as-objects', t => {
  const fn = asObjects();
  t.equal(typeof fn, 'function');

  const fnOpts = asObjects({packKeys: true, streamKeys: false, fieldPrefix: 'col'});
  t.equal(typeof fnOpts, 'function');

  const s1: Duplex = asObjects.asStream();
  t.ok(s1);

  const w: {readable: ReadableStream; writable: WritableStream} = asObjects.asWebStream();
  t.ok(w);

  const wp = asObjects.withParser();
  t.ok(wp);

  const wps: Duplex = asObjects.withParserAsStream();
  t.ok(wps);

  const wpw: {readable: ReadableStream; writable: WritableStream} = asObjects.withParserAsWebStream();
  t.ok(wpw);

  const objToken: asObjects.AsObjectsToken = {name: 'startObject'};
  t.ok(objToken);

  const opts: asObjects.AsObjectsOptions = {packKeys: true, useStringValues: false, fieldPrefix: 'field'};
  t.ok(opts);
});
