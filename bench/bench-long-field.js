// nano-bench scaling check for the rescan-on-wait shape: one long field fed in small chunks.
// Run: `npm run bench -- bench/bench-long-field.js`. Linear cost doubles per size step; a rescan from the field's start quadruples.

import {getManyValues, none} from 'stream-chain/core';

import {csvParser} from '../src/core/parser.js';

export const params = [100000, 200000, 400000, 800000];

const CHUNK = 64;

const sliced = text => {
  text = JSON.parse(JSON.stringify(text));
  const chunks = [];
  for (let i = 0; i < text.length; i += CHUNK) chunks.push(text.slice(i, i + CHUNK));
  return chunks;
};

const filled = (unit, size) => unit.repeat(Math.ceil(size / unit.length)).slice(0, size);

const parseAll = chunks => {
  const parse = csvParser();
  let count = 0;
  for (const chunk of chunks) {
    const result = parse(chunk);
    if (result !== none) count += getManyValues(result).length;
  }
  const result = parse(none);
  if (result !== none) count += getManyValues(result).length;
  return count;
};

export default size => {
  const quoted = sliced('"' + filled('abc,def ""quoted"" ghi\r\n', size) + '"\r\n'),
    unquoted = sliced(filled('abcdefghij', size) + '\r\n'),
    control = sliced(filled('abc,def,ghi\r\n', size));
  return {
    'one quoted field': n => {
      let count = 0;
      for (let i = 0; i < n; ++i) count += parseAll(quoted);
      return count;
    },
    'one unquoted field': n => {
      let count = 0;
      for (let i = 0; i < n; ++i) count += parseAll(unquoted);
      return count;
    },
    'short fields (control)': n => {
      let count = 0;
      for (let i = 0; i < n; ++i) count += parseAll(control);
      return count;
    }
  };
};
