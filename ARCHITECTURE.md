# Architecture

`stream-csv-as-json` is a micro-library of Node.js stream components for creating custom CSV processing pipelines with a minimal memory footprint. It can parse CSV files far exceeding available memory. It has **one runtime dependency** — [stream-json](https://www.npmjs.com/package/stream-json) for token infrastructure. It is designed to integrate with `stream-json` filters, streamers, and [stream-chain](https://www.npmjs.com/package/stream-chain) pipelines.

## Project layout

```
package.json              # Package config
index.js                  # Main entry point: creates Parser + emit()
Parser.js                 # Streaming CSV parser (Transform stream, token stream)
AsObjects.js              # Header row + data rows → object token streams
Stringer.js               # Token stream → CSV text (Transform stream)
tests/                    # Test files (test_*.js, using heya-unit)
├── tests.js              # Test runner entry point
├── ReadString.js         # Test helper: streams a string in configurable chunks
├── test_parser.js        # Parser tests
├── test_sliding.js       # Sliding window / chunked input tests
├── test_main.js          # Main module tests
├── test_stringer.js      # Stringer tests
├── test_asObject.js      # AsObjects tests
└── sample.csv.gz         # Sample compressed CSV for tests
wiki/                     # GitHub wiki documentation (git submodule)
.github/                  # CI workflows, Dependabot config
```

## Core concepts

### Token protocol

The parser produces a stream of `{name, value}` tokens — a SAX-inspired protocol compatible with `stream-json`:

| Token name    | Value  | Meaning                    |
| ------------- | ------ | -------------------------- |
| `startArray`  | —      | Start of a CSV row         |
| `endArray`    | —      | End of a CSV row           |
| `startString` | —      | Start of a field value     |
| `endString`   | —      | End of a field value       |
| `stringChunk` | string | Piece of a field value     |
| `stringValue` | string | Packed complete field value |

All downstream components (AsObjects, Stringer, and `stream-json` filters/streamers) consume and/or produce tokens in this format. This is the universal interchange protocol shared with `stream-json`.

### How the Parser works

1. `Parser` extends `Transform` with `writableObjectMode: false` and `readableObjectMode: true`.
2. It consumes CSV text chunks and produces `{name, value}` tokens representing rows (arrays) of field values (strings).
3. A state machine tracks the current parsing state: `value1` (start of row), `value` (start of field), `regularValue`, `quotedValue`, `quotedContinuation`.
4. Parser options control packing and streaming:
   - `packStrings`/`packValues` (default: true) — emit `stringValue` tokens with the complete field value.
   - `streamStrings`/`streamValues` (default: true) — emit `startString`/`stringChunk`/`endString` tokens for incremental processing.
   - `separator` (default: `','`) — field separator character.
5. Uses sticky RegExp (`/y` flag) when available for performance; falls back to `^` anchored patterns with manual slicing.
6. Handles quoted fields (RFC 4180): double-quote escaping, embedded separators, embedded newlines.
7. Handles both `\r\n` and `\n` line endings.

### AsObjects

`AsObjects` extends `Transform` (objectMode both sides). It transforms the token stream in two phases:

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

Static methods:
- `AsObjects.make(options)` / `AsObjects.asObjects(options)` — create instance.
- `AsObjects.withParser(options)` — create a pipeline with the CSV parser via `stream-json/utils/withParser`.

### Stringer

`Stringer` extends `Transform` (writableObjectMode: true, readableObjectMode: false). Converts a CSV token stream back into CSV text.

Two modes:
1. **Stream mode** (default): Consumes `startString`/`stringChunk`/`endString` tokens. Always quotes fields (wraps in `"`), escapes `"` as `""`.
2. **Value mode** (`useStringValues: true`): Consumes `stringValue` tokens. Quotes only when necessary (field contains separator, `"`, `\r`, or `\n`).

Options:
- `useStringValues`/`useValues` (default: false) — switch to value mode.
- `separator` (default: `','`) — field separator character.

Rows are terminated with `\r\n`.

### Main module

`index.js` creates a `Parser` with `emit()` applied (from `stream-json/utils/emit`), so the returned stream emits named events for each token type.

## Module dependency graph

```
index.js ── Parser.js, stream-json/utils/emit

Parser.js ── node:stream (Transform)

AsObjects.js ── node:stream (Transform), stream-json/utils/withParser

Stringer.js ── node:stream (Transform)
```

## Import paths

```js
// Main API (parser + emit)
const make = require('stream-csv-as-json');

// Named exports
const {Parser, parser} = require('stream-csv-as-json');

// Core components
const Parser = require('stream-csv-as-json/Parser');
const AsObjects = require('stream-csv-as-json/AsObjects');
const Stringer = require('stream-csv-as-json/Stringer');

// Named factory exports
const {asObjects} = require('stream-csv-as-json/AsObjects');
const {stringer} = require('stream-csv-as-json/Stringer');

// Pipeline with parser
const {withParser} = require('stream-csv-as-json/AsObjects');
```

## Integration with stream-json

Because the token protocol is compatible with `stream-json`, you can use `stream-json` components downstream:

```js
const {chain} = require('stream-chain');
const {parser} = require('stream-csv-as-json');
const {asObjects} = require('stream-csv-as-json/AsObjects');
const {streamValues} = require('stream-json/streamers/StreamValues');

chain([
  fs.createReadStream('data.csv'),
  parser(),
  asObjects(),
  streamValues(),
  ({value}) => process(value)
]);
```

After `AsObjects` converts rows to object tokens, `stream-json`'s `streamValues` assembles them into JavaScript objects.

## Testing

- **Framework**: heya-unit
- **Run all**: `npm test` (runs `node tests/tests.js`)
- **Run single file**: `node tests/test_<name>.js`
- **Test helper**: `tests/ReadString.js` streams a string in configurable chunk sizes for testing chunked input.
