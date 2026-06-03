import type {Duplex} from 'node:stream';

import test from 'tape-six';
import parser from '../../src/parser.js';

test('types: parser', t => {
  const fn = parser();
  t.equal(typeof fn, 'function');

  const fnOpts = parser({packValues: true, streamValues: false, separator: '|'});
  t.equal(typeof fnOpts, 'function');

  const s1: Duplex = parser.asStream();
  t.ok(s1);

  const s2: Duplex = parser.asStream({packStrings: false});
  t.ok(s2);

  const w: {readable: ReadableStream; writable: WritableStream} = parser.asWebStream();
  t.ok(w);

  const opts: parser.ParserOptions = {packStrings: true, streamStrings: false, separator: ','};
  t.ok(opts);
});

test('types: parser token union narrows', t => {
  const tokens: parser.Token[] = [
    {name: 'startArray'},
    {name: 'endArray'},
    {name: 'startString'},
    {name: 'endString'},
    {name: 'stringChunk', value: 'x'},
    {name: 'stringValue', value: 'y'}
  ];
  for (const token of tokens) {
    if (token.name === 'stringValue' || token.name === 'stringChunk') {
      const v: string = token.value;
      t.equal(typeof v, 'string');
    }
  }
  const name: parser.TokenName = 'startArray';
  t.equal(name, 'startArray');
});
