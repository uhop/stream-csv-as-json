'use strict';

// CommonJS consumers can require() this ESM (type:module) package on Node >=22.12,
// where require(ESM) loads the synchronous module graph. Because every default
// export has a named-export mirror, `const {make, parser} = require('…')` works.
// This pins that consumption path (and that no x.x = x self-aliases sneak back in).

const {test} = require('tape-six');

const {make, parser} = require('../../src/index.js');
const {stringer} = require('../../src/stringer.js');
const {asObjects} = require('../../src/as-objects.js');
const {readString} = require('../helpers.js');

test('cjs: named exports resolve via require(ESM)', t => {
  t.equal(typeof make, 'function');
  t.equal(typeof parser, 'function');
  t.equal(typeof parser.asStream, 'function');
  t.equal(typeof parser.asWebStream, 'function');
  t.equal(typeof stringer, 'function');
  t.equal(typeof stringer.asStream, 'function');
  t.equal(typeof asObjects, 'function');
  t.equal(typeof asObjects.asStream, 'function');
  t.equal(typeof asObjects.withParser, 'function');
});

test('cjs: no x.x = x self-aliases', t => {
  t.equal(make.parser, undefined);
  t.equal(parser.parser, undefined);
  t.equal(stringer.stringer, undefined);
  t.equal(asObjects.asObjects, undefined);
});

test.asPromise('cjs: parse a CSV end-to-end', (t, resolve, reject) => {
  const stream = make();
  let rows = 0,
    values = 0;
  stream.on('startArray', () => ++rows);
  stream.on('stringValue', () => ++values);
  stream.on('error', reject);
  stream.on('end', () => {
    t.equal(rows, 2);
    t.equal(values, 4);
    resolve();
  });
  readString('a,b\r\n1,2\r\n').pipe(stream);
});
