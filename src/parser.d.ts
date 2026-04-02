/// <reference types="node" />

import {Duplex, DuplexOptions} from 'node:stream';
import {Flushable, Many, none} from 'stream-chain/defs.js';

export = parser;

/**
 * Creates a streaming CSV parser that consumes text and produces a SAX-like token stream.
 *
 * Each CSV row is represented as an array of strings using `startArray`/`endArray` tokens.
 * Individual field values can be streamed piece-wise or packed into single tokens.
 *
 * @param options - Parser configuration including packing, streaming, and separator options.
 * @returns A flushable function for use in a `chain()` pipeline.
 */
declare function parser(options?: parser.ParserOptions): Flushable<string, Many<parser.Token> | typeof none>;

declare namespace parser {
  /** A single token emitted by the CSV parser. */
  export interface Token {
    /** Token type name (e.g., `'startArray'`, `'stringValue'`). */
    name: string;
    /** Token payload. Present for value tokens; `undefined` for structural tokens. */
    value?: string;
  }

  /** Options for the CSV parser. Extends Node.js `DuplexOptions`. */
  export interface ParserOptions extends DuplexOptions {
    /** Pack strings into `stringValue` tokens. Default: `true`. */
    packStrings?: boolean;
    /** Alias for `packStrings`. */
    packValues?: boolean;
    /** Emit `startString`/`endString`/`stringChunk` tokens. Default: `true`. */
    streamStrings?: boolean;
    /** Alias for `streamStrings`. */
    streamValues?: boolean;
    /** Field separator character. Default: `','`. */
    separator?: string;
  }

  /**
   * Creates a parser wrapped as a Duplex stream.
   *
   * Writable side accepts text (Buffer/string), readable side emits token objects.
   *
   * @param options - Parser configuration.
   * @returns A Duplex stream (writable: text mode, readable: object mode).
   */
  export function asStream(options?: ParserOptions): Duplex;
  /** Self-reference for destructuring: `const {parser} = require('stream-csv-as-json/parser.js')`. */
  export {parser};
}
