import parser, {ParserOptions} from './parser.js';

/**
 * Web entry point — creates a CSV parser as a Web `TransformStream`-shaped pair.
 *
 * Convenience alias for `parser.asWebStream(options)` from
 * `stream-csv-as-json/web/parser.js`. Pulls in no Node-specific dependencies;
 * safe for browser bundles. (The Node entry's `emit()` event sugar is Node-only.)
 *
 * @param options - Parser options (packing, streaming, separator).
 * @returns `{readable, writable}` — a `ReadableStream`/`WritableStream` pair.
 */
declare function make(options?: ParserOptions): {readable: ReadableStream; writable: WritableStream};

export default make;
export {make, parser};
