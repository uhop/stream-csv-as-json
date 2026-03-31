const {test} = require('tape-six');

test('cjs: require main entry point', t => {
  const makeParser = require('../src/index.js');
  t.equal(typeof makeParser, 'function');
  t.equal(typeof makeParser.parser, 'function');
});

test('cjs: require parser', t => {
  const parser = require('../src/parser.js');
  t.equal(typeof parser, 'function');
  t.equal(typeof parser.asStream, 'function');
  t.equal(typeof parser.parser, 'function');
});

test('cjs: require stringer', t => {
  const stringer = require('../src/stringer.js');
  t.equal(typeof stringer, 'function');
  t.equal(typeof stringer.asStream, 'function');
  t.equal(typeof stringer.stringer, 'function');
});

test('cjs: require as-objects', t => {
  const asObjects = require('../src/as-objects.js');
  t.equal(typeof asObjects, 'function');
  t.equal(typeof asObjects.asStream, 'function');
  t.equal(typeof asObjects.asObjects, 'function');
  t.equal(typeof asObjects.withParser, 'function');
  t.equal(typeof asObjects.withParserAsStream, 'function');
});

test('cjs: require utils/with-parser', t => {
  const withParser = require('../src/utils/with-parser.js');
  t.equal(typeof withParser, 'function');
  t.equal(typeof withParser.asStream, 'function');
});

test.asPromise('cjs: full pipeline with require', (t, resolve, reject) => {
  const {Readable} = require('node:stream');
  const chain = require('stream-chain');
  const {parser} = require('../src/index.js');
  const asObjects = require('../src/as-objects.js');

  const result = [],
    pipeline = chain([Readable.from(['a,b\r\n1,2\r\n']), parser(), asObjects()]);

  pipeline.on('data', item => result.push(item));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    const keyValues = result.filter(t => t.name === 'keyValue');
    t.ok(keyValues.length > 0);
    resolve();
  });
});
