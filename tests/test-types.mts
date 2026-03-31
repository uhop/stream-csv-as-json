import type {Duplex} from 'node:stream';

import test from 'tape-six';
import make from '../src/index.js';
import parser from '../src/parser.js';
import stringer from '../src/stringer.js';
import asObjects from '../src/as-objects.js';
import withParser from '../src/utils/with-parser.js';

test('types: index (make)', t => {
  const mainStream: Duplex = make();
  t.ok(mainStream);

  const mainStreamOpts: Duplex = make({packValues: true});
  t.ok(mainStreamOpts);

  const p: typeof parser = make.parser;
  t.equal(p, parser);
});

test('types: parser', t => {
  const fn = parser();
  t.equal(typeof fn, 'function');

  const fnOpts = parser({packValues: true, streamValues: false, separator: '|'});
  t.equal(typeof fnOpts, 'function');

  const s1: Duplex = parser.asStream();
  t.ok(s1);

  const s2: Duplex = parser.asStream({packStrings: false});
  t.ok(s2);

  const opts: parser.ParserOptions = {packStrings: true, streamStrings: false, separator: ','};
  t.ok(opts);
});

test('types: stringer', t => {
  const fn = stringer();
  t.equal(typeof fn, 'function');

  const s1: Duplex = stringer.asStream();
  t.ok(s1);

  const s2: Duplex = stringer.asStream({useValues: true, separator: '\t'});
  t.ok(s2);

  const s3 = stringer.stringer({useStringValues: true});
  t.equal(typeof s3, 'function');

  const opts: stringer.StringerOptions = {useValues: true, separator: ','};
  t.ok(opts);
});

test('types: as-objects', t => {
  const fn = asObjects();
  t.equal(typeof fn, 'function');

  const fnOpts = asObjects({packKeys: true, streamKeys: false, fieldPrefix: 'col'});
  t.equal(typeof fnOpts, 'function');

  const s1: Duplex = asObjects.asStream();
  t.ok(s1);

  const self = asObjects.asObjects;
  t.equal(self, asObjects);

  const wp = asObjects.withParser();
  t.ok(wp);

  const wps: Duplex = asObjects.withParserAsStream();
  t.ok(wps);

  const opts: asObjects.AsObjectsOptions = {packKeys: true, useStringValues: false, fieldPrefix: 'field'};
  t.ok(opts);
});

test('types: with-parser', t => {
  const fn = withParser(asObjects, {});
  t.ok(fn);

  const s: Duplex = withParser.asStream(asObjects, {});
  t.ok(s);
});
