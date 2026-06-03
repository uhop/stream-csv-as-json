# Architecture

`stream-csv-as-json` is a micro-library of stream components for building custom CSV processing pipelines with a minimal memory footprint, on **Node.js or Web Streams**. It can parse CSV files far exceeding available memory. It has **two runtime dependencies** — [stream-json](https://www.npmjs.com/package/stream-json) for token infrastructure (`Assembler`, `emit`) and [stream-chain](https://www.npmjs.com/package/stream-chain) for pipeline composition and the Node/Web stream adapters. It is designed to integrate with `stream-json` filters and streamers. ESM-only, Node 22+.

## Project layout

```
package.json              # Package config (type: module, Node >=22)
tsconfig.json             # TypeScript config for .d.ts (strict, noEmit, es2022, node16)
tsconfig.check.json       # JS lint config (allowJs+checkJs, noUnusedLocals/Parameters)
src/
├── core/                 # Substrate-free factories (import only stream-chain/core + utils)
│   ├── parser.js (+.d.ts)        # Streaming CSV parser (flushable factory)
│   ├── as-objects.js (+.d.ts)    # Header row → object token stream
│   ├── stringer.js (+.d.ts)      # Token stream → CSV text
│   └── utils/with-parser.js (+.d.ts)  # parser + fn composition
├── index.js (+.d.ts)     # Node entry: default = parser + emit()
├── parser.js (+.d.ts)    # Node wrapper: attaches .asStream + .asWebStream
├── as-objects.js (+.d.ts)
├── stringer.js (+.d.ts)
├── utils/with-parser.js (+.d.ts)
├── web/                  # Web Streams wrappers (browser-safe, no node:*)
│   ├── index.js (+.d.ts) # Web entry: default = parser.asWebStream
│   ├── parser.js (+.d.ts)        # attaches .asWebStream only
│   ├── as-objects.js (+.d.ts)
│   ├── stringer.js (+.d.ts)
│   └── utils/with-parser.js (+.d.ts)
└── file/                 # Node-only file-edge components (fs)
    ├── parser.js (+.d.ts)        # parseFile = gen(asyncBlockReader, parser)
    ├── stringer.js (+.d.ts)      # stringerToFile = gen(stringer, asyncBlockWriter)
    └── index.js (+.d.ts)
tests/                    # Tests (tape-six)
├── helpers.js            # Node helpers: readString (chunked input), streamToArray
├── web-helpers.js        # Browser-safe Web Streams helpers: readWebString, drain, writeAndCollect
├── node/test-*.js        # Node-substrate suites + test-types.ts
├── web/test-*.js         # Web-substrate suites (mirror the node suites)
└── data/sample.csv.gz    # Sample compressed CSV for tests
wiki/                     # GitHub wiki documentation (git submodule)
.github/                  # CI workflows, Dependabot config
```

## Three-substrate design

The library mirrors the `stream-json` 3.x architecture: one substrate-free implementation, two thin adapter layers.

- **`src/core/*`** — pure factories. Each returns a `flushable(...)` (a regular function consuming tokens/text, returning `many(tokens)` / a string / `none`). They import only `stream-chain/core` (`flushable`, `gen`, `many`, `none`) and `stream-chain/utils/fixUtf8Stream.js`. No `node:*`, no Web globals — safe to import anywhere.
- **`src/*` (Node)** — re-export the core factory with `.asStream` (Node `Duplex`, via `asStream` from `stream-chain`) and `.asWebStream` (Web pair, via `asWebStream` from `stream-chain/web`) attached, plus `export * from './core/...'`.
- **`src/web/*`** — re-export the core factory with only `.asWebStream` attached. Browser-safe: pulls in no `node:*`.

The `exports` map exposes `.` (Node entry), `./web` (Web entry), and `./*` (every file, so `stream-csv-as-json/core/parser.js`, `/parser.js`, `/web/parser.js`, etc. all resolve). Because the Node and Web wrappers both import and mutate the **same** core factory singleton, a process that imports both ends up with both adapters on the shared object; a core-only import stays adapter-free.

## Core concepts

### Token protocol

The parser produces a stream of `{name, value}` tokens — a SAX-inspired protocol compatible with `stream-json`:

| Token name    | Value  | Meaning                     |
| ------------- | ------ | --------------------------- |
| `startArray`  | —      | Start of a CSV row          |
| `endArray`    | —      | End of a CSV row            |
| `startString` | —      | Start of a field value      |
| `endString`   | —      | End of a field value        |
| `stringChunk` | string | Piece of a field value      |
| `stringValue` | string | Packed complete field value |

All downstream components (asObjects, stringer, and `stream-json` filters/streamers) consume and/or produce tokens in this format. This is the universal interchange protocol shared with `stream-json`. The `.d.ts` exports these as discriminated unions (`parser.Token`, `asObjects.AsObjectsToken`), so a `switch (token.name)` narrows `token.value` per arm.

### How the Parser works

1. `parser(options)` returns a flushable function composed with `fixUtf8Stream()` via `gen()`. `parser.asStream(options)` wraps it as a Node `Duplex`; `parser.asWebStream(options)` wraps it as a Web `{readable, writable}` pair.
2. It consumes CSV text chunks and produces `{name, value}` tokens representing rows (arrays) of field values (strings).
3. A state machine tracks the current parsing state: `value1` (start of row), `value` (start of field), `regularValue`, `quotedValue`, `quotedContinuation`.
4. Parser options control packing and streaming:
   - `packStrings`/`packValues` (default: true) — emit `stringValue` tokens with the complete field value.
   - `streamStrings`/`streamValues` (default: true) — emit `startString`/`stringChunk`/`endString` tokens for incremental processing.
   - `separator` (default: `','`) — field separator character.
5. The value state takes a `charCodeAt` whole-field fast path: it scans an unquoted field (or a quoted field, decoding `""` escapes) to its terminator in a single pass and emits one set of tokens with no regex engine — when the terminating separator/CR/LF is already in the buffer. Fields that abut the buffer tail, empty fields, row terminators, and multi-char separators fall back **verbatim** to the incremental sticky-regex (`/y` flag) machine, which preserves exact resumability and error behavior. Structural tokens (`startArray`/`endArray`/`startString`/`endString`) are module-level singletons. Each parser instance gets its own regex pattern set built from the configured separator.
6. Handles quoted fields (RFC 4180): double-quote escaping, embedded separators, embedded newlines. CRLF is the spec line terminator; the parser also accepts LF and bare CR.
7. Strips a single leading UTF-8 BOM (`U+FEFF`) from the input.
8. Throws on malformed quoted values:
   - Unterminated quoted value at end-of-input: `"Parser cannot parse input: expected a quoted value"`.
   - Non-separator/non-newline character after a closing quote: `"Parser cannot parse input: unexpected character after a quoted value"`.
9. Returns `many(tokens)` or `none` from `stream-chain` for proper backpressure handling.

### asObjects

`asObjects(options)` returns a flushable function. It transforms the token stream in two phases:

1. **Header phase**: Consumes the first row to build a list of field names. The collector handles both parser modes: `startString`/`stringChunk`/`endString` sequences (default parser) and packed `stringValue` tokens (`parser({streamStrings: false})`). It is safe to wire any parser configuration through `asObjects()` without an explicit option.
2. **Data phase**: Converts subsequent rows from array tokens to object tokens:
   - `startArray` → `startObject`
   - Before each field value, emits `startKey`/`stringChunk`/`endKey` and/or `keyValue` tokens with the field name.
   - `endArray` → `endObject`

Options:

- `packKeys` (default: true) — emit `keyValue` tokens.
- `streamKeys` (default: true) — emit `startKey`/`stringChunk`/`endKey` tokens.
- `fieldPrefix` (default: `'field'`) — prefix for unnamed fields (used when data has more columns than headers, or when a header cell is empty).
- `useStringValues` / `useValues` — deprecated no-op kept for backward compatibility; the header collector now auto-detects parser mode.

Methods: `asObjects.asStream(options)` (Node `Duplex`), `asObjects.asWebStream(options)` (Web pair), `asObjects.withParser(options)` (parser + asObjects composition), `asObjects.withParserAsStream(options)`, `asObjects.withParserAsWebStream(options)`.

### stringer

`stringer(options)` returns a flushable function. Converts a CSV token stream back into CSV text.

Two modes:

1. **Stream mode** (default): Consumes `startString`/`stringChunk`/`endString` tokens. Always quotes fields (wraps in `"`), escapes `"` as `""`.
2. **Value mode** (`useStringValues: true`): Consumes `stringValue` tokens. Quotes only when necessary (field contains separator, `"`, `\r`, or `\n`).

Options: `useStringValues`/`useValues` (default: false), `separator` (default: `','`), `rowTerminator` (default: `'\r\n'`; override with `'\n'` for Unix-style output). Methods: `stringer.asStream(options)` (Node), `stringer.asWebStream(options)` (Web).

### Main module

`src/index.js` (Node) creates a parser stream with `emit()` applied (from `stream-json/utils/emit`), so the returned `Duplex` emits named events for each token type. `src/web/index.js` default-exports `parser.asWebStream` (the `emit()` event sugar is Node-only).

### with-parser

`src/core/utils/with-parser.js` is a CSV-specific version of `stream-json`'s `withParser` utility. It composes the CSV parser with another component factory via `gen()`. The node/web wrappers attach `.asStream` / `.asWebStream`.

### file components

Node-only file-edge stages (`src/file/`). `parseFile(options)` = `gen(asyncBlockReader(options), parser(options))` turns a file path into a CSV token stream; `stringerToFile(path, options)` = `gen(stringer(options), asyncBlockWriter(path, options))` writes a token stream to a file. Both reuse stream-chain's public `asyncBlockReader` / `asyncBlockWriter` utils (64 KB read / 1 MB write blocks, `StringDecoder` for cross-block UTF-8). Drive them with `pipe` + `drain` from `stream-chain/utils` — the writer closes its file handle on the flush signal. They resolve through the `./*` export (no dedicated `exports` entry); `src/file/index.js` is a barrel.

## Module dependency graph

```
src/core/parser.js          ── stream-chain/core (flushable, gen, many, none), stream-chain/utils/fixUtf8Stream
src/core/as-objects.js      ── stream-chain/core (flushable, many, none)
src/core/stringer.js        ── stream-chain/core (flushable, none)
src/core/utils/with-parser.js ── stream-chain/core (gen), src/core/parser

src/parser.js               ── stream-chain (asStream), stream-chain/web (asWebStream), src/core/parser
src/as-objects.js           ── stream-chain (asStream), stream-chain/web (asWebStream), src/core/as-objects, src/utils/with-parser
src/stringer.js             ── stream-chain (asStream), stream-chain/web (asWebStream), src/core/stringer
src/utils/with-parser.js    ── stream-chain (asStream), stream-chain/web (asWebStream), src/core/utils/with-parser
src/index.js                ── src/parser, stream-json/utils/emit

src/web/parser.js           ── stream-chain/web (asWebStream), src/core/parser
src/web/as-objects.js       ── stream-chain/web (asWebStream), src/core/as-objects, src/web/utils/with-parser
src/web/stringer.js         ── stream-chain/web (asWebStream), src/core/stringer
src/web/utils/with-parser.js ── stream-chain/web (asWebStream), src/core/utils/with-parser
src/web/index.js            ── src/web/parser

src/file/parser.js          ── stream-chain/core (gen), stream-chain/utils/asyncBlockReader, src/core/parser
src/file/stringer.js        ── stream-chain/core (gen), stream-chain/utils/asyncBlockWriter, src/core/stringer
src/file/index.js           ── src/file/parser, src/file/stringer
```

## Import paths

```js
// Node main API (parser + emit)
import make from 'stream-csv-as-json';
import {parser} from 'stream-csv-as-json';

// Node components (factory + .asStream + .asWebStream)
import parser from 'stream-csv-as-json/parser.js';
import asObjects from 'stream-csv-as-json/as-objects.js';
import stringer from 'stream-csv-as-json/stringer.js';

// Web Streams entry (browser-safe)
import webMake from 'stream-csv-as-json/web';
import parser from 'stream-csv-as-json/web/parser.js';

// Substrate-free factory (no adapters)
import parser from 'stream-csv-as-json/core/parser.js';

// Stream wrappers
const parserStream = parser.asStream(options); // Node Duplex
const parserWeb = parser.asWebStream(options); // Web {readable, writable}

// Pipeline with parser
const pipeline = asObjects.withParser(options);
const pipelineStream = asObjects.withParserAsStream(options);
```

## Integration with stream-json

Because the token protocol is compatible with `stream-json`, you can use `stream-json` components downstream:

```js
import fs from 'node:fs';
import chain from 'stream-chain';
import {parser} from 'stream-csv-as-json';
import asObjects from 'stream-csv-as-json/as-objects.js';
import streamValues from 'stream-json/streamers/stream-values.js';

chain([fs.createReadStream('data.csv'), parser(), asObjects(), streamValues(), ({value}) => process(value)]);
```

After `asObjects` converts rows to object tokens, `stream-json`'s `streamValues` assembles them into JavaScript objects.

## Testing

- **Framework**: tape-six. `npm test` runs both `tests/node/` (Node) and `tests/web/` (Web) suites.
- **Cross-runtime**: `npm run test:bun`, `npm run test:deno`, `npm run test:browser` (puppeteer, web suite).
- **Type-check (`.d.ts`)**: `npm run ts-check` (`tsc --noEmit`). **JS lint**: `npm run js-check` (`tsc --project tsconfig.check.json` over `src/`). **TS typing tests**: `npm run ts-test`.
- **Lint**: `npm run lint` / `npm run lint:fix`. **Bench**: `npm run bench`.
- **Helpers**: `tests/helpers.js` (`readString`) for Node; `tests/web-helpers.js` (`readWebString`, `drain`) for Web — browser-safe, no `node:*`.
- The `tape6` config in `package.json` carries an `importmap` that routes `stream-chain` / `stream-chain/{web,core}` / `stream-json` to their source files for cross-runtime and browser runs.
