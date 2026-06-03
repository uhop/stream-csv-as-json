import type {StringerOptions} from '../core/stringer.js';
import type {AsObjectsToken} from '../core/as-objects.js';

/**
 * Node-only output-edge sink: writes a CSV token stream to a file path.
 * `stringerToFile(path, options)` returns a composed `gen()` sink — drive it
 * with `pipe` + `drain` so the writer's flush closes the file handle.
 *
 * @param path - Destination file path (opened with `'w'`).
 * @param options - Stringer options plus `writeBlockSize`.
 */
declare function stringerToFile(path: string, options?: stringerToFile.StringerToFileOptions): (value: AsObjectsToken) => AsyncGenerator<never, void, unknown>;

declare namespace stringerToFile {
  /** Options for `stringerToFile`. Extends the CSV stringer options. */
  export interface StringerToFileOptions extends StringerOptions {
    /** File write block size in bytes. Default: `1048576` (1 MB). */
    writeBlockSize?: number;
  }
}

type StringerToFileOptions = stringerToFile.StringerToFileOptions;

export default stringerToFile;
export {stringerToFile, stringerToFile as stringer};
export type {StringerToFileOptions};
