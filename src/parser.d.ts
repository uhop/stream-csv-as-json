/// <reference types="node" />

import {Duplex, DuplexOptions} from 'node:stream';
import type {ParserOptions as CoreParserOptions, Token as CoreToken, TokenName as CoreTokenName} from './core/parser.js';

/**
 * Creates a streaming CSV parser that consumes text and produces a SAX-like token stream.
 *
 * Node-flavored entry: the returned factory has both `parser.asStream(options)`
 * (Node Duplex) and `parser.asWebStream(options)` (Web `TransformStream`-shaped pair) attached.
 *
 * @param options - Parser configuration including packing, streaming, and separator options.
 * @returns A flushable function for use in a `chain()` pipeline.
 */
declare function parser(options?: parser.ParserOptions): ReturnType<typeof import('./core/parser.js').default>;

declare namespace parser {
  /** A single token emitted by the parser. */
  export type Token = CoreToken;
  /** Closed set of token-type names. Equivalent to `Token['name']`. */
  export type TokenName = CoreTokenName;

  /** Options for the CSV parser. Extends Node.js `DuplexOptions`. */
  export interface ParserOptions extends CoreParserOptions, DuplexOptions {}

  /** Creates a parser wrapped as a Node Duplex stream (writable: text, readable: object mode). */
  export function asStream(options?: ParserOptions): Duplex;
  /** Creates a parser wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream(options?: ParserOptions): {readable: ReadableStream; writable: WritableStream};
}

type Token = parser.Token;
type TokenName = parser.TokenName;
type ParserOptions = parser.ParserOptions;

export default parser;
export {parser};
export type {Token, TokenName, ParserOptions};
