# AGENTS.md — stream-csv-as-json

> `stream-csv-as-json` is a micro-library of stream components for building custom CSV processing pipelines with a minimal memory footprint, on Node.js or Web Streams. It can parse CSV files far exceeding available memory streaming individual primitives using a SAX-inspired API. It depends on [stream-json](https://www.npmjs.com/package/stream-json) for token infrastructure (`Assembler`, `emit`) and [stream-chain](https://www.npmjs.com/package/stream-chain) for pipeline composition and the Node/Web stream adapters.

For project structure and architecture overview see [ARCHITECTURE.md](./ARCHITECTURE.md).
For detailed usage docs and API references see the [wiki](https://github.com/uhop/stream-csv-as-json/wiki).

## Setup

This project uses a git submodule for the wiki:

```bash
git clone --recursive https://github.com/uhop/stream-csv-as-json.git
cd stream-csv-as-json
npm install
```

Requires **Node.js 22+**. The package is **ESM-only**.

## Commands

- **Install:** `npm install`
- **Test:** `npm test` (runs `tape6 --flags FO`; runs both `tests/node/` and `tests/web/`)
- **Test (Bun):** `npm run test:bun`
- **Test (Deno):** `npm run test:deno`
- **Test (sequential):** `npm run test:proc`
- **Test (TS only):** `npm run ts-test`
- **Test (real browser, local only):** `npm run test:browser` — see "Browser safety" below. Never run in CI.
- **Install the browser it needs:** `npm run browser:install` (once per machine)
- **Type-check (`.d.ts`):** `npm run ts-check` (runs `tsc --noEmit`)
- **JS lint:** `npm run js-check` (runs `tsc --project tsconfig.check.json` over `src/`)
- **Bench:** `npm run bench` (nano-bench)
- **Lint:** `npm run lint` / `npm run lint:fix`

## Project structure

```
stream-csv-as-json/
├── package.json            # Package config (type: module, Node >=22)
├── tsconfig.json           # TypeScript config for .d.ts (strict, noEmit, es2022, node16)
├── tsconfig.check.json     # JS lint config (allowJs+checkJs, noUnusedLocals/Parameters)
├── src/
│   ├── core/               # Substrate-free factories (import stream-chain/core)
│   │   ├── parser.js (+.d.ts)
│   │   ├── as-objects.js (+.d.ts)
│   │   ├── stringer.js (+.d.ts)
│   │   └── utils/with-parser.js (+.d.ts)
│   ├── index.js (+.d.ts)   # Node entry: default = parser + emit()
│   ├── parser.js (+.d.ts)  # Node wrapper: attaches .asStream + .asWebStream
│   ├── as-objects.js (+.d.ts)
│   ├── stringer.js (+.d.ts)
│   ├── utils/with-parser.js (+.d.ts)
│   ├── web/                # Web Streams wrappers (browser-safe, no node:*)
│   │   ├── index.js (+.d.ts)   # Web entry: default = parser.asWebStream
│   │   ├── parser.js (+.d.ts)  # attaches .asWebStream only
│   │   ├── as-objects.js (+.d.ts)
│   │   ├── stringer.js (+.d.ts)
│   │   └── utils/with-parser.js (+.d.ts)
│   └── file/               # Node-only file-edge components (fs)
│       ├── parser.js (+.d.ts)     # parseFile = gen(asyncBlockReader, parser)
│       ├── stringer.js (+.d.ts)   # stringerToFile = gen(stringer, asyncBlockWriter)
│       └── index.js (+.d.ts)
├── tests/                  # Tests (tape-six)
│   ├── helpers.js          # Node test helpers (readString, streamToArray)
│   ├── web-helpers.js      # Browser-safe Web Streams helpers (readWebString, drain, writeAndCollect)
│   ├── node/test-*.js      # Node-substrate suites + test-types.ts
│   ├── web/test-*.js       # Web-substrate suites (mirror the node suites)
│   └── data/sample.csv.gz  # Sample compressed CSV for tests
├── wiki/                   # GitHub wiki documentation (git submodule)
└── .github/                # CI workflows, Dependabot config
```

## Code style

- **ESM** source (`"type": "module"` in package.json). Source and tests use `import` with explicit `.js` extensions; no CommonJS.
- **No transpilation** — source runs directly. Node.js 22+ floor.
- **Prettier** for formatting (see `.prettierrc`): 160 char width, single quotes, no bracket spacing, no trailing commas, arrow parens "avoid".
- 2-space indentation.
- Semicolons are enforced by Prettier (default `semi: true`).
- Source uses `import`/`export`. Each `.js` file has a `// @ts-self-types` header pointing to its `.d.ts`. No JSDoc type annotations in `.js` beyond the `@ts-self-types` line and minimal `@type` casts.
- Shortest correct import form: default import for a single default-bearing symbol, all-named when pulling several from one module, never mixed `import X, {Y}`.
- **No comments that narrate the code.** Comments are short _why_-markers only: a non-trivial decision or constraint, an algorithm reference, or JSDoc where it is required (`.d.ts` sidecars). Never a restatement of _what_ the code does. Strip narrating comments in files you already touch.

## Critical rules

- **Two runtime dependencies: `stream-chain` and `stream-json`.** Do not add other packages to `dependencies`. Only `devDependencies` are allowed.
- **Three-substrate split.** `src/core/*` holds substrate-free factories (import only `stream-chain/core` + `stream-chain/utils/*`). `src/*` (Node) attaches `.asStream` + `.asWebStream`. `src/web/*` attaches `.asWebStream` only. Keep the algorithm in `core/`; the wrappers are thin.
- **Browser safety is load-bearing.** Nothing reachable from `src/core/*`, `src/web/*`, `tests/web/*`, or `tests/web-helpers.js` may import `node:*`. Web tests use `stream-json/web/assembler.js`, never `stream-json/assembler.js`. Two checks, in increasing order of strength:
  - a grep audit — `grep -rnE "(from|require\()\s*['\"]node:" src/core src/web tests/web tests/web-helpers.js` must return nothing;
  - `npm run test:browser` — the `tests/web/` suite in real headless chromium, where a `node:*` leak simply fails to load. The CLI runtimes (Node/Bun/Deno) all expose `node:`, so **only this run actually proves the invariant**.
- **`test:browser` is development-only and must never enter CI.** `tape-six-puppeteer` is a normal `devDependency`; what keeps it safe is the **`allowScripts`** block in `package.json` (`{"tape-six-puppeteer": false, "puppeteer": false}`), which npm honors natively. It is load-bearing, not hygiene: without it `npm install` runs two postinstalls — `puppeteer`'s `node install.mjs` and tape-six-puppeteer's `puppeteer browsers install chrome` — and a corrupt Chrome download once failed `npm ci` before any test ran. Note the original break was **not** the script running in CI (the workflow never invoked it); it was the devDep's postinstall during `npm ci`. Do not remove `allowScripts`, and do not add `test:browser` to `.github/workflows/`.
- **`test:browser` must invoke the runner by path**, not by bin name — `node node_modules/tape-six-puppeteer/bin/tape6-puppeteer.js`. Blocking a package in `allowScripts` also suppresses npm's bin-linking for it, so `node_modules/.bin/tape6-puppeteer` never exists. Matches `stream-chain`.
- **The browser is installed by hand**, once per machine: `npm run browser:install`. Puppeteer pins an exact build, so a cached but different Chrome version is not a match — that script goes through the _locally installed_ puppeteer, so it fetches exactly the build this project's version wants. `npx puppeteer …` does **not** work here (`allowScripts` suppresses the `puppeteer` bin link, so npx exits 127); `PUPPETEER_EXECUTABLE_PATH` remains an escape hatch for pointing at an existing binary.
- **No CJS export artifacts.** Don't attach `x.x = x` self-aliases (e.g. `parser.parser = parser`) to exported functions — pure ESM uses `export default X; export {X}` (the named-export mirror) for both import forms; `import {parser} from '…'` already works. The `.asStream` / `.asWebStream` adapter methods are real API, not artifacts.
- **Do not modify or delete test expectations** without understanding why they changed.
- **Token-based architecture.** The parser produces `{name, value}` tokens compatible with `stream-json`'s token protocol. All components operate on this protocol.
- **Backpressure is handled by `stream-chain`.** Components are flushable functions composed via `gen()` and wrapped with `asStream()` / `asWebStream()`.

## Architecture

- **parser** (`src/core/parser.js`) is the core. It consumes CSV text and produces a SAX-like token stream. Uses `flushable()`/`gen()`/`many`/`none` from `stream-chain/core`, wrapped with `fixUtf8Stream()` via `gen()`.
  - Factory: `parser(options)` returns a flushable function. `parser.asStream(options)` returns a Node `Duplex`; `parser.asWebStream(options)` returns a Web `{readable, writable}` pair (Node entry attaches both; Web entry only `.asWebStream`).
  - Options: `packStrings`/`packValues` (default: true), `streamStrings`/`streamValues` (default: true), `separator` (default: `','`).
  - The value state takes a `charCodeAt` whole-field fast path (unquoted + quoted-with-`""` fields whose terminator is already buffered), falling back verbatim to the incremental sticky-regex machine for fields that abut the buffer tail, empty fields, row terminators, and multi-char separators. Structural tokens are module-level singletons. Each parser instance gets its own regex pattern set.
  - Reads CRLF (RFC 4180), LF, and bare CR as row terminators.
  - Strips a single leading UTF-8 BOM (`U+FEFF`) at the start of input.
  - Throws on malformed quoted values: an unterminated quoted value at end-of-input, or a non-separator/non-newline character after a closing quote.
- **asObjects** (`src/core/as-objects.js`) transforms the token stream: uses the first row as field names, converts subsequent rows from array tokens to object tokens.
  - Factory: `asObjects(options)`. `asObjects.asStream(options)` / `asObjects.asWebStream(options)`.
  - Options: `packKeys`, `streamKeys`, `fieldPrefix` (default: `'field'`).
  - The header collector auto-detects the upstream parser's mode (stream tokens or packed `stringValue`); the legacy `useStringValues` / `useValues` options are deprecated no-ops.
  - `asObjects.withParser(options)` / `.withParserAsStream(options)` / `.withParserAsWebStream(options)` for combined pipelines.
- **stringer** (`src/core/stringer.js`) converts a CSV token stream back to CSV text. Handles quoting of values containing separators, quotes, or newlines.
  - Factory: `stringer(options)`. `stringer.asStream(options)` / `stringer.asWebStream(options)`.
  - Options: `useStringValues`/`useValues`, `separator` (default: `','`), `rowTerminator` (default: `'\r\n'` per RFC 4180; pass `'\n'` for Unix-style output).
- **Main module** (`src/index.js`) creates a parser stream with `emit()` applied (from `stream-json/utils/emit`) — Node-only event sugar. The Web entry (`src/web/index.js`) default-exports `parser.asWebStream`.
- **with-parser** (`src/core/utils/with-parser.js`) CSV-specific version of `stream-json`'s `withParser` utility; node/web wrappers attach the adapters.
- **file components** (`src/file/parser.js`, `src/file/stringer.js`) Node-only file-edge stages. `parseFile(options)` = `gen(asyncBlockReader, parser)` turns a path into a token stream; `stringerToFile(path, options)` = `gen(stringer, asyncBlockWriter)` writes a token stream to a file. Reuse stream-chain's `asyncBlockReader` / `asyncBlockWriter`. Drive with `pipe` + `drain` from `stream-chain/utils` (the writer closes its handle on flush). Resolve via `./*` (no new `exports` entry).

## Token protocol

The parser represents CSV as a stream of JSON-like tokens (typed as the discriminated union `parser.Token`):

| Token name    | Value  | Meaning                     |
| ------------- | ------ | --------------------------- |
| `startArray`  | —      | Start of a CSV row          |
| `endArray`    | —      | End of a CSV row            |
| `startString` | —      | Start of a field value      |
| `endString`   | —      | End of a field value        |
| `stringChunk` | string | Piece of a field value      |
| `stringValue` | string | Packed complete field value |

After `asObjects`, additional tokens appear (the union `asObjects.AsObjectsToken` extends `parser.Token`):

| Token name    | Value  | Meaning                      |
| ------------- | ------ | ---------------------------- |
| `startObject` | —      | Start of a data row (object) |
| `endObject`   | —      | End of a data row (object)   |
| `startKey`    | —      | Start of field name          |
| `endKey`      | —      | End of field name            |
| `keyValue`    | string | Packed field name            |

## Writing tests

Node suite (`tests/node/`):

```js
import test from 'tape-six';
import chain from 'stream-chain';

import parser from '../../src/parser.js';
import {readString} from '../helpers.js';

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

Web suite (`tests/web/`) — browser-safe, no `node:*`:

```js
import test from 'tape-six';
import {chain} from 'stream-chain/web';

import parser from '../../src/web/parser.js';
import {readWebString, drain} from '../web-helpers.js';

test.asPromise('example test (web)', async (t, resolve, reject) => {
  try {
    const out = await drain(chain([readWebString('a,b\n1,2\n'), parser()]));
    t.ok(out.length > 0);
    resolve();
  } catch (e) {
    reject(e);
  }
});
```

- Test framework: tape-six. `test.asPromise()` for async stream tests.
- Test file naming: `test-*.js` in `tests/node/` (Node) and `tests/web/` (Web); `test-*.ts` for TypeScript typing tests.
- The tape6 config keeps `tests/node/` and `tests/web/` as separate globs; `npm test` (CLI) runs both — the Web-substrate suites run under Node/Bun/Deno's native Web Streams.
- `tests/helpers.js` (`readString`) for Node; `tests/web-helpers.js` (`readWebString`, `drain`) for Web. Web tests must not import `node:*` and use `stream-json/web/assembler.js`.

## Key conventions

- Two runtime dependencies: `stream-chain` and `stream-json`. Do not add others.
- All public API is under `src/`: core factories in `src/core/`, Node wrappers in `src/`, Web wrappers in `src/web/`. The `exports` map exposes `.`, `./web`, and `./*`.
- Wiki documentation lives in the `wiki/` submodule.
- Components are factory functions returning flushable closures, with `.asStream()` (Node `Duplex`) and `.asWebStream()` (Web pair) wrapping.
- `asObjects` exports `.withParser()` / `.withParserAsStream()` / `.withParserAsWebStream()` for pipeline creation.
- The token protocol is compatible with `stream-json` — you can use `stream-json` filters, streamers, and utilities downstream.

## When reading the codebase

- Start with `ARCHITECTURE.md` for the module map and dependency graph.
- `src/core/parser.js` is the core — read it first to understand the CSV token protocol.
- `src/core/as-objects.js` converts array-of-strings rows into object token streams.
- `src/core/stringer.js` does the inverse: token stream back to CSV text.
- `src/parser.js` (Node) and `src/web/parser.js` (Web) are the thin adapter wrappers over the core factory.
- Wiki markdown files in `wiki/` contain detailed usage docs.
