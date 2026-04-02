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
- **Test:** `npm test` (runs `tape6 --flags FO`)
- **Test (TS only):** `npm run ts-test`
- **Type-check:** `npm run ts-check` (runs `tsc --noEmit`)
- **Lint:** `npm run lint` / `npm run lint:fix`

## Project structure

```
stream-csv-as-json/
├── package.json            # Package config (type: commonjs)
├── tsconfig.json           # TypeScript config (noEmit, es2022, node16)
├── src/                    # Source files
│   ├── index.js            # Main entry point: parser + emit()
│   ├── index.d.ts          # TypeScript declarations for index
│   ├── parser.js           # Streaming CSV parser (flushable function)
│   ├── parser.d.ts         # TypeScript declarations for parser
│   ├── as-objects.js       # Header row → object token stream
│   ├── as-objects.d.ts     # TypeScript declarations for as-objects
│   ├── stringer.js         # Token stream → CSV text
│   ├── stringer.d.ts       # TypeScript declarations for stringer
│   └── utils/
│       ├── with-parser.js  # CSV-specific withParser utility
│       └── with-parser.d.ts
├── tests/                  # Tests (tape-six)
│   ├── read-string.mjs     # ESM test helper for streaming strings
│   ├── test-parser.mjs     # Parser tests
│   ├── test-sliding.mjs    # Sliding window / chunked input tests
│   ├── test-main.mjs       # Main module tests
│   ├── test-stringer.mjs   # Stringer tests
│   ├── test-as-objects.mjs # AsObjects tests
│   ├── test-cjs.cjs        # CommonJS smoke test
│   ├── test-types.mts      # TypeScript typing tests
│   └── sample.csv.gz       # Sample compressed CSV for tests
├── wiki/                   # GitHub wiki documentation (git submodule)
└── .github/                # CI workflows, Dependabot config
```

## Code style

- **CommonJS** source (`"type": "commonjs"` in package.json). Tests use ESM (`.mjs`), TS (`.mts`), and CJS (`.cjs`).
- **No transpilation** — source runs directly.
- **Prettier** for formatting (see `.prettierrc`): 160 char width, single quotes, no bracket spacing, no trailing commas, arrow parens "avoid".
- 2-space indentation.
- Semicolons are enforced by Prettier (default `semi: true`).
- Source imports use `require()`. Each `.js` file has a `// @ts-self-types` header pointing to its `.d.ts`.
- The package is `stream-csv-as-json`. It depends on `stream-json` at runtime.

## Critical rules

- **One runtime dependency: `stream-json`.** Do not add other packages to `dependencies`. Only `devDependencies` are allowed.
- **Do not modify or delete test expectations** without understanding why they changed.
- **Do not add comments or remove comments** unless explicitly asked.
- **Token-based architecture.** The parser produces `{name, value}` tokens compatible with `stream-json`'s token protocol. All components operate on this protocol.
- **Backpressure is handled by `stream-chain`.** Components are flushable functions composed via `gen()` and wrapped with `asStream()`.

## Architecture

- **parser** (`src/parser.js`) is the core. It consumes CSV text and produces a SAX-like token stream. Uses `flushable()` from `stream-chain`, wrapped with `fixUtf8Stream()` via `gen()`.
  - Factory: `parser(options)` returns a flushable function. `parser.asStream(options)` returns a Duplex.
  - Options: `packStrings`/`packValues` (default: true), `streamStrings`/`streamValues` (default: true), `separator` (default: `','`).
  - Uses sticky RegExp for performance.
- **asObjects** (`src/as-objects.js`) transforms the token stream: uses the first row as field names, converts subsequent rows from array tokens to object tokens.
  - Factory: `asObjects(options)` returns a flushable function. `asObjects.asStream(options)` returns a Duplex.
  - Options: `packKeys`, `streamKeys`, `useStringValues`/`useValues`, `fieldPrefix` (default: `'field'`).
  - `asObjects.withParser(options)` / `asObjects.withParserAsStream(options)` for combined pipelines.
- **stringer** (`src/stringer.js`) converts a CSV token stream back to CSV text. Handles quoting of values containing separators, quotes, or newlines.
  - Factory: `stringer(options)` returns a flushable function. `stringer.asStream(options)` returns a Duplex.
  - Options: `useStringValues`/`useValues`, `separator` (default: `','`).
- **Main module** (`src/index.js`) creates a parser stream with `emit()` applied (from `stream-json/utils/emit`).
- **with-parser** (`src/utils/with-parser.js`) CSV-specific version of `stream-json`'s `withParser` utility.

## Token protocol

The parser represents CSV as a stream of JSON-like tokens:

| Token name    | Value  | Meaning                     |
| ------------- | ------ | --------------------------- |
| `startArray`  | —      | Start of a CSV row          |
| `endArray`    | —      | End of a CSV row            |
| `startString` | —      | Start of a field value      |
| `endString`   | —      | End of a field value        |
| `stringChunk` | string | Piece of a field value      |
| `stringValue` | string | Packed complete field value |

After `asObjects`, additional tokens appear:

| Token name    | Value  | Meaning                      |
| ------------- | ------ | ---------------------------- |
| `startObject` | —      | Start of a data row (object) |
| `endObject`   | —      | End of a data row (object)   |
| `startKey`    | —      | Start of field name          |
| `endKey`      | —      | End of field name            |
| `keyValue`    | string | Packed field name            |

## Writing tests

```js
import test from 'tape-six';
import chain from 'stream-chain';

import parser from '../src/parser.js';
import readString from './read-string.mjs';

test.asPromise('example test', (t, resolve, reject) => {
  const pipeline = chain([readString('a,b\n1,2\n'), parser()]);
  const result = [];
  pipeline.on('data', token => result.push(token));
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.ok(result.length > 0);
    resolve();
  });
});
```

- Test framework: tape-six.
- Test file naming: `test-*.mjs` (ESM), `test-*.cjs` (CJS), `test-*.mts` (TS) in `tests/`.
- ESM tests use `import`, CJS tests use `require()`.
- `test.asPromise()` for stream-based async tests.
- `read-string.mjs` helper for streaming string input at configurable chunk sizes.

## Key conventions

- The only runtime dependency is `stream-json`. Do not add others.
- All public API is in `src/`: `index.js`, `parser.js`, `as-objects.js`, `stringer.js`.
- Wiki documentation lives in the `wiki/` submodule.
- Components are factory functions returning flushable closures, with `.asStream()` for Duplex wrapping.
- `asObjects` exports `.withParser()` / `.withParserAsStream()` for pipeline creation.
- The token protocol is compatible with `stream-json` — you can use `stream-json` filters, streamers, and utilities downstream.

## When reading the codebase

- Start with `ARCHITECTURE.md` for the module map and dependency graph.
- `src/parser.js` is the core — read it first to understand the CSV token protocol.
- `src/as-objects.js` converts array-of-strings rows into object token streams.
- `src/stringer.js` does the inverse: token stream back to CSV text.
- Wiki markdown files in `wiki/` contain detailed usage docs.
