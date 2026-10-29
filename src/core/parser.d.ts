import {Flushable, Many, none} from 'stream-chain/defs.js';

/**
 * Creates a streaming CSV parser that consumes text and produces a SAX-like token stream.
 *
 * Each CSV row is represented as an array of strings using `startArray`/`endArray` tokens.
 * Individual field values can be streamed piece-wise or packed into single tokens.
 *
 * Row terminator acceptance is lenient — CRLF (RFC 4180), LF, and bare CR all work.
 * One leading byte-order mark (`U+FEFF`) is dropped, whether the input is bytes or strings,
 * unless `ignoreBOM` is set. A surrogate pair is never split between two `stringChunk` tokens.
 *
 * This is the pure, stream-agnostic factory — no `.asStream` / `.asWebStream` adapters
 * attached. For the Node-flavored entry (with both adapters) import from
 * `stream-csv-as-json/parser.js`; for the Web-only entry import from
 * `stream-csv-as-json/web/parser.js`.
 *
 * @param options - Parser configuration including packing, streaming, and separator options.
 * @returns A flushable function for use in a `chain()` pipeline.
 * @throws `Error` when the input contains a malformed quoted value:
 *   - `"Parser cannot parse input: expected a quoted value"` if the input ends mid-quote.
 *   - `"Parser cannot parse input: unexpected character after a quoted value"` if a character
 *     other than the separator, CR, LF, or `"` appears immediately after a closing `"`.
 */
declare function parser(options?: parser.ParserOptions): Flushable<string, Many<parser.Token> | typeof none>;

declare namespace parser {
  /**
   * A single token emitted by the CSV parser. Discriminated union over `name` —
   * narrowing on `chunk.name` in a `switch` block tightens `chunk.value` per arm.
   */
  export type Token =
    | {name: 'startArray'}
    | {name: 'endArray'}
    | {name: 'startString'}
    | {name: 'endString'}
    | {name: 'stringChunk'; value: string}
    | {name: 'stringValue'; value: string};

  /** Closed set of token-type names. Equivalent to `Token['name']`. */
  export type TokenName = Token['name'];

  /** Options for the CSV parser. */
  export interface ParserOptions {
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
    /** Keep a byte-order mark (U+FEFF) that starts the input instead of dropping it. Default: `false`. */
    ignoreBOM?: boolean;
  }
}

/**
 * The tokenizer behind `parser()`, without its `fixUtf8Stream()` front: it consumes strings only,
 * and a leading byte-order mark stays in the first field (`ignoreBOM` has no effect here).
 *
 * @param options - Parser configuration.
 * @returns A flushable function for use in a `chain()` pipeline.
 */
declare function csvParser(options?: parser.ParserOptions): Flushable<string, Many<parser.Token> | typeof none>;

type Token = parser.Token;
type TokenName = parser.TokenName;
type ParserOptions = parser.ParserOptions;

export default parser;
export {parser, csvParser};
export type {Token, TokenName, ParserOptions};
