// @ts-self-types="./stringer.d.ts"

// Node-only output-edge sink: writes a CSV token stream to a file path.
// Composes the core CSV stringer with stream-chain's async block writer via
// `gen()`. Must be flushed (use `pipe` + `drain`) so the file handle closes:
//
//   import pipe from 'stream-chain/utils/pipe.js';
//   import drain from 'stream-chain/utils/drain.js';
//   import parseFile from 'stream-csv-as-json/file/parser.js';
//   import stringerToFile from 'stream-csv-as-json/file/stringer.js';
//
//   await drain(pipe(parseFile(), stringerToFile('out.csv', {useValues: true}))('in.csv'));

import {gen} from 'stream-chain/core';
import asyncBlockWriter from 'stream-chain/utils/asyncBlockWriter.js';

import stringer from '../core/stringer.js';

const stringerToFile = (path, options) => gen(stringer(options), asyncBlockWriter(path, options));

export default stringerToFile;
export {stringerToFile, stringerToFile as stringer};
