/// <reference types="node" />

import {Duplex} from 'node:stream';
import parser, {ParserOptions} from './parser.js';

/**
 * Creates a CSV parser stream decorated with `emit()`, so tokens are emitted as events.
 *
 * Convenience over `parser.asStream(options)`: the returned Duplex re-emits every
 * token as a named event (`startArray`, `stringValue`, …) in addition to `data`.
 *
 * @param options - Parser options (packing, streaming, separator).
 * @returns A Duplex stream that emits token events.
 */
declare function make(options?: ParserOptions): Duplex;

export default make;
export {make, parser};
