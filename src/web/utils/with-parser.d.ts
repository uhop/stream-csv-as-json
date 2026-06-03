import type {Flushable} from 'stream-chain/defs.js';

import type {ParserOptions, Token} from '../../core/parser.js';

/**
 * Web entry — creates a pipeline of CSV `parser()` piped into a component created by `fn`.
 *
 * The returned factory has `withParser.asWebStream(...)` attached.
 *
 * Generic in `O` (the shape of `fn`'s options, inferred from `fn`) and `T`
 * (the downstream component's per-chunk output, inferred from `fn`'s return).
 *
 * @param fn - A factory function that takes options and returns a stream component.
 * @param options - Shared options passed to both the parser and `fn`.
 */
declare function withParser<O, T = unknown>(fn: (options?: O) => Flushable<Token, T>, options?: NoInfer<O> & ParserOptions): Flushable<string, T>;

declare namespace withParser {
  /** Same as `withParser()` but returns the pipeline wrapped as a Web `TransformStream`-shaped pair. */
  export function asWebStream<O>(
    fn: (options?: O) => Flushable<Token, unknown>,
    options?: NoInfer<O> & ParserOptions
  ): {readable: ReadableStream; writable: WritableStream};
}

export default withParser;
export {withParser};
