/// <reference types="node" />

import {Duplex, DuplexOptions} from 'node:stream';
import {Flushable, Many, none} from 'stream-chain/defs.js';
import {ParserOptions} from './parser';
import parser from './parser';

export = asObjects;

/**
 * Creates a flushable function that converts a CSV token stream
 * (arrays of strings) into an object token stream using the first row as field names.
 *
 * @param options - AsObjects configuration.
 * @returns A flushable function for use in a `chain()` pipeline.
 */
declare function asObjects(options?: asObjects.AsObjectsOptions): Flushable<parser.Token, Many<parser.Token> | typeof none>;

declare namespace asObjects {
  /** Options for AsObjects. Extends Node.js `DuplexOptions`. */
  export interface AsObjectsOptions extends DuplexOptions {
    /** Pack object keys into `keyValue` tokens. Default: `true`. */
    packKeys?: boolean;
    /** Alias for `packKeys`. */
    packValues?: boolean;
    /** Emit `startKey`/`endKey`/`stringChunk` tokens for keys. Default: `true`. */
    streamKeys?: boolean;
    /** Alias for `streamKeys`. */
    streamValues?: boolean;
    /** Use packed `stringValue` tokens in the header phase. Default: `false`. */
    useStringValues?: boolean;
    /** Alias for `useStringValues`. */
    useValues?: boolean;
    /** Prefix for unnamed fields. Default: `'field'`. */
    fieldPrefix?: string;
  }

  /** Creates an AsObjects function as a Duplex stream. */
  export function asStream(options?: AsObjectsOptions): Duplex;
  /** Self-reference for destructuring. */
  export {asObjects};
  /** Creates a pipeline of CSV parser + asObjects. */
  export function withParser(options?: AsObjectsOptions & ParserOptions): any;
  /** Creates a pipeline of CSV parser + asObjects wrapped as a Duplex stream. */
  export function withParserAsStream(options?: AsObjectsOptions & ParserOptions & DuplexOptions): Duplex;
}
