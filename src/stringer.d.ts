/// <reference types="node" />

import {Duplex, DuplexOptions} from 'node:stream';
import {Flushable, none} from 'stream-chain/defs.js';
import parser from './parser';

export = stringer;

/**
 * Creates a flushable function that converts a CSV token stream into CSV text.
 *
 * @param options - Stringer configuration.
 * @returns A flushable function for use in a `chain()` pipeline.
 */
declare function stringer(options?: stringer.StringerOptions): Flushable<parser.Token, string | typeof none>;

declare namespace stringer {
  /** Options for the CSV Stringer. Extends Node.js `DuplexOptions`. */
  export interface StringerOptions extends DuplexOptions {
    /** Use packed `stringValue` tokens instead of streamed string chunks. Default: `false`. */
    useStringValues?: boolean;
    /** Alias for `useStringValues`. */
    useValues?: boolean;
    /** Field separator character. Default: `','`. */
    separator?: string;
  }

  /** Creates a Stringer as a Duplex stream.
   *
   * @param options - Stringer configuration.
   * @returns A Duplex stream (writable: object mode, readable: text mode).
   */
  export function asStream(options?: StringerOptions): Duplex;
  /** Self-reference for destructuring: `const {stringer} = require('stream-csv-as-json/stringer.js')`. */
  export {stringer};
}
