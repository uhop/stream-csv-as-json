import {Flushable, none} from 'stream-chain/defs.js';
import type {AsObjectsToken} from './as-objects.js';

/**
 * Creates a flushable function that converts a CSV token stream into CSV text.
 *
 * Accepts both raw parser tokens and the object/key tokens added by `asObjects`
 * (the latter are ignored — only array/string tokens contribute to the output).
 *
 * This is the pure, stream-agnostic factory — no `.asStream` / `.asWebStream` adapters
 * attached. For the Node-flavored entry (with both adapters) import from
 * `stream-csv-as-json/stringer.js`; for the Web-only entry import from
 * `stream-csv-as-json/web/stringer.js`.
 *
 * @param options - Stringer configuration.
 * @returns A flushable function for use in a `chain()` pipeline.
 */
declare function stringer(options?: stringer.StringerOptions): Flushable<AsObjectsToken, string | typeof none>;

declare namespace stringer {
  /** Options for the CSV Stringer. */
  export interface StringerOptions {
    /** Use packed `stringValue` tokens instead of streamed string chunks. Default: `false`. */
    useStringValues?: boolean;
    /** Alias for `useStringValues`. */
    useValues?: boolean;
    /** Field separator character. Default: `','`. */
    separator?: string;
    /**
     * Row terminator string. Default: `'\r\n'` per RFC 4180.
     * Common alternative: `'\n'` for Unix-style output.
     */
    rowTerminator?: string;
  }
}

type StringerOptions = stringer.StringerOptions;

export default stringer;
export {stringer};
export type {StringerOptions};
