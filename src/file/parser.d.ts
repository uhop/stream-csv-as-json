import type {ParserOptions, Token} from '../core/parser.js';

/**
 * Node-only input-edge stage: turns a file path into a CSV token stream.
 * `parseFile(options)` returns a composed `gen()` function — pass the file path
 * as its input value, driving it with `pipe` + `drain` from `stream-chain/utils`.
 *
 * @param options - Parser options plus `readBlockSize`.
 */
declare function parseFile(options?: parseFile.ParseFileOptions): (path: string) => AsyncGenerator<Token, void, unknown>;

declare namespace parseFile {
  /** Options for `parseFile`. Extends the CSV parser options. */
  export interface ParseFileOptions extends ParserOptions {
    /** File read block size in bytes. Default: `65536` (64 KB). */
    readBlockSize?: number;
  }
}

type ParseFileOptions = parseFile.ParseFileOptions;

export default parseFile;
export {parseFile, parseFile as parser};
export type {ParseFileOptions};
