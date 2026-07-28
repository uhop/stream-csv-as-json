import {Flushable, Many, none} from 'stream-chain/defs.js';
import type {Token as ParserToken} from './parser.js';

/**
 * Creates a flushable function that converts a CSV token stream (arrays of strings)
 * into an object token stream, using the first row as field names.
 *
 * This is the pure, stream-agnostic factory — no `.asStream` / `.asWebStream` adapters
 * attached. For the Node-flavored entry (with both adapters and `.withParser*`) import
 * from `stream-csv-as-json/as-objects.js`; for the Web-only entry import from
 * `stream-csv-as-json/web/as-objects.js`.
 *
 * @param options - AsObjects configuration.
 * @returns A flushable function for use in a `chain()` pipeline.
 */
declare function asObjects(options?: asObjects.AsObjectsOptions): Flushable<ParserToken, Many<asObjects.AsObjectsToken> | typeof none>;

declare namespace asObjects {
  /**
   * Tokens emitted by `asObjects` — the parser's CSV token vocabulary extended with
   * the object/key tokens that turn each row into an object. Discriminated over `name`.
   */
  export type AsObjectsToken =
    ParserToken | {name: 'startObject'} | {name: 'endObject'} | {name: 'startKey'} | {name: 'endKey'} | {name: 'keyValue'; value: string};

  /** Closed set of `asObjects` token-type names. Equivalent to `AsObjectsToken['name']`. */
  export type AsObjectsTokenName = AsObjectsToken['name'];

  /** Options for AsObjects. */
  export interface AsObjectsOptions {
    /** Pack object keys into `keyValue` tokens. Default: `true`. */
    packKeys?: boolean;
    /** Alias for `packKeys`. */
    packValues?: boolean;
    /** Emit `startKey`/`endKey`/`stringChunk` tokens for keys. Default: `true`. */
    streamKeys?: boolean;
    /** Alias for `streamKeys`. */
    streamValues?: boolean;
    /**
     * @deprecated The header collector auto-detects whether the upstream parser
     * is emitting stream tokens or packed `stringValue` tokens; this option is
     * a no-op kept for backward compatibility.
     */
    useStringValues?: boolean;
    /** @deprecated Alias for the deprecated `useStringValues`. No-op. */
    useValues?: boolean;
    /** Prefix for unnamed fields. Default: `'field'`. */
    fieldPrefix?: string;
  }
}

type AsObjectsToken = asObjects.AsObjectsToken;
type AsObjectsTokenName = asObjects.AsObjectsTokenName;
type AsObjectsOptions = asObjects.AsObjectsOptions;

export default asObjects;
export {asObjects};
export type {AsObjectsToken, AsObjectsTokenName, AsObjectsOptions};
