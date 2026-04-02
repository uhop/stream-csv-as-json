/// <reference types="node" />

import {Duplex, DuplexOptions} from 'node:stream';
import {Flushable, Many, none, FunctionList} from 'stream-chain/defs.js';
import parser, {ParserOptions} from '../parser';

/**
 * Creates a pipeline of CSV `parser()` piped into a component created by `fn`.
 *
 * @param fn - A factory function that takes options and returns a stream component (flushable function).
 * @param options - Shared options passed to both the parser and `fn`.
 * @returns A function list representing the composed pipeline (parser → fn).
 */
declare function withParser(
  fn: (options?: object) => Flushable<parser.Token, Many<parser.Token> | typeof none>,
  options?: ParserOptions
): FunctionList<Flushable<parser.Token, Many<parser.Token> | typeof none>, string, Many<parser.Token> | typeof none>;

declare namespace withParser {
  /**
   * Same as `withParser()` but returns the pipeline wrapped as a Duplex stream.
   *
   * @param fn - A factory function that takes options and returns a stream component.
   * @param options - Shared options passed to both the parser and `fn`.
   * @returns A Duplex stream (writable: text, readable: object mode).
   */
  export function asStream(
    fn: (options?: object) => Flushable<parser.Token, Many<parser.Token> | typeof none>,
    options?: ParserOptions & DuplexOptions
  ): Duplex;
}

export = withParser;
