import type {ParserOptions as CoreParserOptions, Token as CoreToken, TokenName as CoreTokenName} from '../core/parser.js';

/**
 * Web entry — creates a streaming CSV parser that consumes text and produces a token stream.
 *
 * The returned factory has `parser.asWebStream(options)` attached (a Web
 * `TransformStream`-shaped `{readable, writable}` pair). Pulls in no Node-specific
 * dependencies; safe for browser bundles.
 *
 * @param options - Parser configuration including packing, streaming, and separator options.
 * @returns A flushable function for use in a `chain()` pipeline.
 */
declare function parser(options?: parser.ParserOptions): ReturnType<typeof import('../core/parser.js').default>;

declare namespace parser {
  /** A single token emitted by the parser. */
  export type Token = CoreToken;
  /** Closed set of token-type names. Equivalent to `Token['name']`. */
  export type TokenName = CoreTokenName;

  /** Options for the CSV parser. */
  export interface ParserOptions extends CoreParserOptions {}

  /** Creates a parser wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream(options?: ParserOptions): {readable: ReadableStream; writable: WritableStream};
}

type Token = parser.Token;
type TokenName = parser.TokenName;
type ParserOptions = parser.ParserOptions;

export default parser;
export {parser};
export type {Token, TokenName, ParserOptions};
