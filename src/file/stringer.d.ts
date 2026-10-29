import type {StringerOptions} from '../core/stringer.js';
import type {AsObjectsToken} from '../core/as-objects.js';

/**
 * Node-only output-edge sink: writes a CSV token stream to a file path.
 * `stringerToFile(path, options)` returns a composed `gen()` sink — drive it
 * with `pipe` + `drain` so the writer's flush writes its buffered tail and closes
 * the file handle. A pipeline that ends without a flush releases the handle
 * through the sink's `close()`.
 *
 * @param path - Destination file path (opened with `'w'`).
 * @param options - Stringer options plus `writeBlockSize`.
 */
declare function stringerToFile(path: string, options?: stringerToFile.StringerToFileOptions): stringerToFile.StringerToFile;

declare namespace stringerToFile {
  /** Options for `stringerToFile`. Extends the CSV stringer options. */
  export interface StringerToFileOptions extends StringerOptions {
    /** File write block size in bytes. Default: `1048576` (1 MB). */
    writeBlockSize?: number;
  }

  /** The sink returned by `stringerToFile()`. */
  export interface StringerToFile {
    (value: AsObjectsToken): AsyncGenerator<never, void, unknown>;
    /**
     * Releases the file handle without writing the buffered tail, after any
     * write in flight settles. The pipeline calls it when it ends without a flush (an
     * error in another stage, an early break); call it yourself when driving the sink
     * some other way. Idempotent, and a no-op after a clean flush; every later call to
     * the sink throws.
     */
    close(): Promise<void>;
  }
}

type StringerToFileOptions = stringerToFile.StringerToFileOptions;
type StringerToFile = stringerToFile.StringerToFile;

export default stringerToFile;
export {stringerToFile, stringerToFile as stringer};
export type {StringerToFile, StringerToFileOptions};
