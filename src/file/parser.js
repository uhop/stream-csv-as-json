// @ts-self-types="./parser.d.ts"

// Node-only input-edge stage: turns a file path into a CSV token stream.
// Composes stream-chain's async block reader with the core CSV parser via
// `gen()`. Drive it by passing the path as the input value — use `pipe` + `drain`:
//
//   import pipe from 'stream-chain/utils/pipe.js';
//   import drain from 'stream-chain/utils/drain.js';
//   import parseFile from 'stream-csv-as-json/file/parser.js';
//
//   await drain(pipe(parseFile(), token => { ...; return none; })('input.csv'));

import {gen} from 'stream-chain/core';
import asyncBlockReader from 'stream-chain/utils/asyncBlockReader.js';

import {csvParser} from '../core/parser.js';

// not `parser()`: the reader already decodes and drops the BOM, and the
// `fixUtf8Stream()` in front of `parser()` would drop a second U+FEFF
const parseFile = options => gen(asyncBlockReader(options), csvParser(options));

export default parseFile;
export {parseFile, parseFile as parser};
