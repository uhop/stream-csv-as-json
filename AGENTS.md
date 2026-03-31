# AGENTS.md — stream-csv-as-json

> `stream-csv-as-json` is a micro-library of Node.js stream components for creating custom CSV processing pipelines with a minimal memory footprint. It can parse CSV files far exceeding available memory streaming individual primitives using a SAX-inspired API. It depends on [stream-json](https://www.npmjs.com/package/stream-json) for token infrastructure and [stream-chain](https://www.npmjs.com/package/stream-chain) for pipeline composition.

For project structure and architecture overview see [ARCHITECTURE.md](./ARCHITECTURE.md).
For detailed usage docs and API references see the [wiki](https://github.com/uhop/stream-csv-as-json/wiki).

## Setup

This project uses a git submodule for the wiki:

```bash
git clone --recursive git@github.com:uhop/stream-csv-as-json.git
cd stream-csv-as-json
npm install
```

## Commands

- **Install:** `npm install`
- **Test:** `npm test` (runs `node tests/tests.js`)
- **Test (single file):** `node tests/test_<name>.js`

## Project structure

```
stream-csv-as-json/
├── package.json          # Package config
├── index.js              # Main entry point: creates Parser + emit()
├── Parser.js             # Streaming CSV parser (Transform stream, token stream)
├── AsObjects.js          # Converts header row + data rows into object token streams
├── Stringer.js           # Token stream → CSV text (Transform stream)
├── tests/                # Test files (test_*.js, using heya-unit)
│   ├── tests.js          # Test runner entry point
│   ├── ReadString.js     # Test helper for streaming strings
│   ├── test_parser.js    # Parser tests
│   ├── test_sliding.js   # Sliding window / chunked input tests
│   ├── test_main.js      # Main module tests
│   ├── test_stringer.js  # Stringer tests
│   ├── test_asObject.js  # AsObjects tests
│   └── sample.csv.gz     # Sample compressed CSV for tests
├── wiki/                 # GitHub wiki documentation (git submodule)
└── .github/              # CI workflows, Dependabot config
```

## Code style

- **CommonJS** throughout (no `"type"` field in package.json — defaults to commonjs).
- **No transpilation** — code runs directly.
- **Prettier** for formatting (see `.prettierrc`): 160 char width, single quotes, no bracket spacing, no trailing commas, arrow parens "avoid".
- 2-space indentation.
- Semicolons are enforced by Prettier (default `semi: true`).
- Imports use `require()` syntax.
- The package is `stream-csv-as-json`. It depends on `stream-json` at runtime.

## Critical rules

- **One runtime dependency: `stream-json`.** Do not add other packages to `dependencies`. Only `devDependencies` are allowed.
- **Do not modify or delete test expectations** without understanding why they changed.
- **Do not add comments or remove comments** unless explicitly asked.
- **Token-based architecture.** The parser produces `{name, value}` tokens compatible with `stream-json`'s token protocol. All components operate on this protocol.
- **Backpressure must be handled correctly.** All stream components extend Node.js Transform streams.

## Architecture

- **Parser** (`Parser.js`) is the core. It consumes CSV text and produces a SAX-like token stream: `{name: 'startArray'}`, `{name: 'stringValue', value: '...'}`, `{name: 'stringChunk', value: '...'}`, etc. Each CSV row is represented as an array of strings.
  - Extends `Transform` (writableObjectMode: false, readableObjectMode: true).
  - Options: `packStrings`/`packValues` (default: true), `streamStrings`/`streamValues` (default: true), `separator` (default: `','`).
  - Uses sticky RegExp when available for performance.
- **AsObjects** (`AsObjects.js`) transforms the token stream: uses the first row as field names, then converts subsequent rows from array tokens to object tokens (`startObject`/`endObject`, `keyValue`, etc.).
  - Options: `packKeys`, `streamKeys`, `useStringValues`/`useValues`, `fieldPrefix` (default: `'field'`).
  - Has a `.withParser(options)` static method for pipeline creation.
- **Stringer** (`Stringer.js`) converts a CSV token stream back to CSV text. Handles quoting of values containing separators, quotes, or newlines.
  - Options: `useStringValues`/`useValues`, `separator` (default: `','`).
- **Main module** (`index.js`) creates a Parser with `emit()` applied (from `stream-json/utils/emit`).

## Token protocol

The parser represents CSV as a stream of JSON-like tokens:

| Token name    | Value  | Meaning                      |
| ------------- | ------ | ---------------------------- |
| `startArray`  | —      | Start of a CSV row           |
| `endArray`    | —      | End of a CSV row             |
| `startString` | —      | Start of a field value       |
| `endString`   | —      | End of a field value         |
| `stringChunk` | string | Piece of a field value       |
| `stringValue` | string | Packed complete field value   |

After `AsObjects`, additional tokens appear:

| Token name    | Value  | Meaning                      |
| ------------- | ------ | ---------------------------- |
| `startObject` | —      | Start of a data row (object) |
| `endObject`   | —      | End of a data row (object)   |
| `startKey`    | —      | Start of field name          |
| `endKey`      | —      | End of field name            |
| `keyValue`    | string | Packed field name            |

## Writing tests

```js
'use strict';

const unit = require('heya-unit');
const {Readable} = require('stream');
const Parser = require('../Parser');

unit.add(module, [
  function test_example(t) {
    const async = t.startAsync('example');
    const parser = new Parser();
    const output = [];
    parser.on('data', chunk => output.push(chunk));
    parser.on('end', () => {
      eval(t.TEST('output.length > 0'));
      async.done();
    });
    Readable.from(['a,b\n1,2\n']).pipe(parser);
  }
]);
```

- Test framework: heya-unit.
- Test file naming: `test_*.js` in `tests/`.
- CommonJS throughout.
- Tests are registered with `unit.add(module, [...])` and run via `tests/tests.js`.

## Key conventions

- The only runtime dependency is `stream-json`. Do not add others.
- All public API is in the root directory: `index.js`, `Parser.js`, `AsObjects.js`, `Stringer.js`.
- Wiki documentation lives in the `wiki/` submodule.
- Components follow the class pattern with static `.make()` factories.
- `AsObjects` exports `.withParser()` for pipeline creation with the CSV parser.
- The token protocol is compatible with `stream-json` — you can use `stream-json` filters, streamers, and utilities downstream.

## When reading the codebase

- Start with `ARCHITECTURE.md` for the module map and dependency graph.
- `Parser.js` is the core — read it first to understand the CSV token protocol.
- `AsObjects.js` converts array-of-strings rows into object token streams.
- `Stringer.js` does the inverse: token stream back to CSV text.
- Wiki markdown files in `wiki/` contain detailed usage docs.
