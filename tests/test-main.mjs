import test from 'tape-six';

import makeParser from '../src/index.js';

import readString from './read-string.mjs';

test.asPromise('main: event emission', (t, resolve, reject) => {
  const input = '1,,"",""""\r\n2,three,"four",';

  const stream = makeParser();

  let values = 0,
    starts = 0,
    rows = 0;
  stream.on('startArray', () => ++rows);
  stream.on('startString', () => ++starts);
  stream.on('stringValue', () => ++values);
  stream.on('error', reject);
  stream.on('end', () => {
    t.equal(rows, 2);
    t.equal(values, 8);
    t.equal(values, starts);
    resolve();
  });

  readString(input).pipe(stream);
});

test.asPromise('main: no packing', (t, resolve, reject) => {
  const input = '1,,"",""","\r\n2,three,"four\r\n",\r\n';

  const stream = makeParser({packStrings: false});

  let starts = 0,
    rows = 0,
    gotValue = false;
  stream.on('startArray', () => ++rows);
  stream.on('startString', () => ++starts);
  stream.on('stringValue', () => (gotValue = true));
  stream.on('error', reject);
  stream.on('end', () => {
    t.equal(rows, 2);
    t.equal(starts, 8);
    t.notOk(gotValue);
    resolve();
  });

  readString(input).pipe(stream);
});

test.asPromise('main: no streaming', (t, resolve, reject) => {
  const input = '1,,"",""""\r\n2,three,"four",\r\n';

  const stream = makeParser({streamStrings: false});

  let values = 0,
    rows = 0,
    gotStart = false;
  stream.on('startArray', () => ++rows);
  stream.on('startString', () => (gotStart = true));
  stream.on('stringValue', () => ++values);
  stream.on('error', reject);
  stream.on('end', () => {
    t.equal(rows, 2);
    t.equal(values, 8);
    t.notOk(gotStart);
    resolve();
  });

  readString(input).pipe(stream);
});

test.asPromise('main: parser re-export', (t, resolve) => {
  t.equal(typeof makeParser.parser, 'function');
  t.equal(typeof makeParser.parser.asStream, 'function');
  resolve();
});
