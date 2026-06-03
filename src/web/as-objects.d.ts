import {Flushable, Many, none} from 'stream-chain/defs.js';
import type {
  AsObjectsOptions as CoreAsObjectsOptions,
  AsObjectsToken as CoreAsObjectsToken,
  AsObjectsTokenName as CoreAsObjectsTokenName
} from '../core/as-objects.js';
import type {ParserOptions} from './parser.js';

/**
 * Web entry — converts a CSV token stream into an object token stream using the
 * first row as field names.
 *
 * The returned factory has `.asWebStream` plus the `.withParser` /
 * `.withParserAsWebStream` convenience pipelines. Browser-safe.
 *
 * @param options - AsObjects configuration.
 * @returns A flushable function for use in a `chain()` pipeline.
 */
declare function asObjects(options?: asObjects.AsObjectsOptions): ReturnType<typeof import('../core/as-objects.js').default>;

declare namespace asObjects {
  /** Tokens emitted by `asObjects` (parser tokens plus object/key tokens). */
  export type AsObjectsToken = CoreAsObjectsToken;
  /** Closed set of `asObjects` token-type names. */
  export type AsObjectsTokenName = CoreAsObjectsTokenName;

  /** Options for AsObjects. */
  export interface AsObjectsOptions extends CoreAsObjectsOptions {}

  /** Creates an AsObjects function as a Web `TransformStream`-shaped pair. */
  export function asWebStream(options?: AsObjectsOptions): {readable: ReadableStream; writable: WritableStream};
  /** Creates a CSV parser + asObjects pipeline (substrate-free). */
  export function withParser(options?: AsObjectsOptions & ParserOptions): Flushable<string, Many<AsObjectsToken> | typeof none>;
  /** Creates a CSV parser + asObjects pipeline wrapped as a Web `TransformStream`-shaped pair. */
  export function withParserAsWebStream(options?: AsObjectsOptions & ParserOptions): {readable: ReadableStream; writable: WritableStream};
}

type AsObjectsToken = asObjects.AsObjectsToken;
type AsObjectsTokenName = asObjects.AsObjectsTokenName;
type AsObjectsOptions = asObjects.AsObjectsOptions;

export default asObjects;
export {asObjects};
export type {AsObjectsToken, AsObjectsTokenName, AsObjectsOptions};
