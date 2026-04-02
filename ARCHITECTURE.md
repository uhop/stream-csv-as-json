# Architecture

`stream-csv-as-json` is a micro-library of Node.js stream components for creating custom CSV processing pipelines with a minimal memory footprint. It can parse CSV files far exceeding available memory. It has **one runtime dependency** — [stream-json](https://www.npmjs.com/package/stream-json) for token infrastructure. It is designed to integrate with `stream-json` filters, streamers, and [stream-chain](https://www.npmjs.com/package/stream-chain) pipelines.

## Project layout

```
package.json              # Package config (type: commonjs)
tsconfig.json             # TypeScript config (noEmit, es2022, node16)
src/
├── index.js (+.d.ts)     # Main entry point: parser + emit()
├── parser.js (+.d.ts)    # Streaming CSV parser (flushable function)
├── as-objects.js (+.d.ts)# Header row → object token stream
├── stringer.js (+.d.ts)  # Token stream → CSV text
└── utils/
    └── with-parser.js (+.d.ts) # CSV-specific withParser utility
tests/                    # Tests (tape-six)
├── read-string.mjs       # ESM test helper: streams a string in configurable chunks
├── test-parser.mjs       # Parser tests
├── test-sliding.mjs      # Sliding window / chunked input tests
├── test-main.mjs         # Main module tests
├── test-stringer.mjs     # Stringer tests
├── test-as-objects.mjs   # AsObjects tests
├── test-cjs.cjs          # CommonJS smoke test
├── test-types.mts        # TypeScript typing tests
└── sample.csv.gz         # Sample compressed CSV for tests
wiki/                     # GitHub wiki documentation (git submodule)
.github/                  # CI workflows, Dependabot config
```

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

All downstream components (AsObjects, Stringer, and `stream-json` filters/streamers) consume and/or produce tokens in this format. This is the universal interchange protocol shared with `stream-json`.

### How the Parser works

1. `parser(options)` returns a flushable function composed with `fixUtf8Stream()` via `gen()`. `parser.asStream(options)` wraps it as a Duplex.
2. It consumes CSV text chunks and produces `{name, value}` tokens representing rows (arrays) of field values (strings).
3. A state machine tracks the current parsing state: `value1` (start of row), `value` (start of field), `regularValue`, `quotedValue`, `quotedContinuation`.
4. Parser options control packing and streaming:
   - `packStrings`/`packValues` (default: true) — emit `stringValue` tokens with the complete field value.
   - `streamStrings`/`streamValues` (default: true) — emit `startString`/`stringChunk`/`endString` tokens for incremental processing.
   - `separator` (default: `','`) — field separator character.
5. Uses sticky RegExp (`/y` flag) for performance.
6. Handles quoted fields (RFC 4180): double-quote escaping, embedded separators, embedded newlines.
7. Handles both `\r\n` and `\n` line endings.
8. Returns `many(tokens)` or `none` from `stream-chain` for proper backpressure handling.

### asObjects

`asObjects(options)` returns a flushable function. It transforms the token stream in two phases:

1. **Header phase**: Consumes the first row's `stringChunk`/`endString` (or `stringValue`) tokens to build a list of field names.
2. **Data phase**: Converts subsequent rows from array tokens to object tokens:
   - `startArray` → `startObject`
   - `endArray` → `endObject`
   - Before each field value, emits `startKey`/`stringChunk`/`endKey` and/or `keyValue` tokens with the field name.

Options:

- `packKeys` (default: true) — emit `keyValue` tokens.
- `streamKeys` (default: true) — emit `startKey`/`stringChunk`/`endKey` tokens.
- `useStringValues`/`useValues` (default: false) — consume `stringValue` tokens instead of `stringChunk`/`endString` in the header phase.
- `fieldPrefix` (default: `'field'`) — prefix for unnamed fields (when data has more columns than headers).

Methods:

- `asObjects.asStream(options)` — wrap as a Duplex stream.
- `asObjects.withParser(options)` — create a pipeline with the CSV parser.
- `asObjects.withParserAsStream(options)` — same, wrapped as a Duplex.

### stringer

`stringer(options)` returns a flushable function. Converts a CSV token stream back into CSV text.

Two modes:

1. **Stream mode** (default): Consumes `startString`/`stringChunk`/`endString` tokens. Always quotes fields (wraps in `"`), escapes `"` as `""`.
2. **Value mode** (`useStringValues: true`): Consumes `stringValue` tokens. Quotes only when necessary (field contains separator, `"`, `\r`, or `\n`).

Options:

- `useStringValues`/`useValues` (default: false) — switch to value mode.
- `separator` (default: `','`) — field separator character.

Rows are terminated with `\r\n`.

### Main module

`src/index.js` creates a parser stream with `emit()` applied (from `stream-json/utils/emit`), so the returned stream emits named events for each token type.

### with-parser

`src/utils/with-parser.js` is a CSV-specific version of `stream-json`'s `withParser` utility. It composes the CSV parser with another component via `gen()`.

## Module dependency graph

```
src/index.js ── src/parser.js, stream-json/utils/emit

src/parser.js ── stream-chain (flushable, many, none, asStream, gen), stream-chain/utils/fixUtf8Stream

src/as-objects.js ── stream-chain (flushable, many, none, asStream), stream-chain/gen, src/utils/with-parser

src/stringer.js ── stream-chain (flushable, none, asStream)

src/utils/with-parser.js ── stream-chain (asStream), stream-chain/gen, src/parser
```

## Import paths

```js
// Main API (parser + emit)
const make = require('stream-csv-as-json');
const {parser} = require('stream-csv-as-json');

// Core components (factory functions)
const parser = require('stream-csv-as-json/parser.js');
const asObjects = require('stream-csv-as-json/as-objects.js');
const stringer = require('stream-csv-as-json/stringer.js');

// Duplex stream wrappers
const parserStream = parser.asStream(options);
const stringerStream = stringer.asStream(options);

// Pipeline with parser
const pipeline = asObjects.withParser(options);
const pipelineStream = asObjects.withParserAsStream(options);
```

## Integration with stream-json

Because the token protocol is compatible with `stream-json`, you can use `stream-json` components downstream:

```js
const chain = require('stream-chain');
const {parser} = require('stream-csv-as-json');
const asObjects = require('stream-csv-as-json/as-objects.js');
const streamValues = require('stream-json/streamers/stream-values.js');

chain([fs.createReadStream('data.csv'), parser(), asObjects(), streamValues(), ({value}) => process(value)]);
```

After `asObjects` converts rows to object tokens, `stream-json`'s `streamValues` assembles them into JavaScript objects.

## Testing

- **Framework**: tape-six
- **Run all**: `npm test` (runs `tape6 --flags FO`)
- **Type-check**: `npm run ts-check` (runs `tsc --noEmit`)
- **Lint**: `npm run lint` / `npm run lint:fix`
- **Test helper**: `tests/read-string.mjs` streams a string in configurable chunk sizes for testing chunked input.
