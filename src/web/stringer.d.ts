import type {StringerOptions as CoreStringerOptions} from '../core/stringer.js';

/**
 * Web entry — converts a CSV token stream into CSV text.
 *
 * The returned factory has `stringer.asWebStream(options)` attached (a Web
 * `TransformStream`-shaped pair). Browser-safe.
 *
 * @param options - Stringer configuration.
 * @returns A flushable function for use in a `chain()` pipeline.
 */
declare function stringer(options?: stringer.StringerOptions): ReturnType<typeof import('../core/stringer.js').default>;

declare namespace stringer {
  /** Options for the CSV Stringer. */
  export interface StringerOptions extends CoreStringerOptions {}

  /** Creates a Stringer as a Web `TransformStream`-shaped pair. */
  export function asWebStream(options?: StringerOptions): {readable: ReadableStream; writable: WritableStream};
}

type StringerOptions = stringer.StringerOptions;

export default stringer;
export {stringer};
export type {StringerOptions};
