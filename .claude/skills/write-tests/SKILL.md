---
name: write-tests
description: Write or update tape-six tests for a module or feature. Use when asked to write tests, add test coverage, or create new test files for stream-csv-as-json.
---

# Write Tests for stream-csv-as-json

Write or update tests using the tape-six testing library. Every component has a Node-substrate
suite and a Web-substrate mirror — a new component needs both.

## Steps

1. Identify the module or feature to test. Read its source code (and the `.d.ts` sidecar) to
   understand the public API.
2. Check existing tests in `tests/node/` and `tests/web/` for conventions and patterns.
3. Create or update the test file:
   - **Node suite** → `tests/node/test-<name>.js`; import the Node wrapper
     (`../../src/parser.js`), `chain` from `stream-chain`, and helpers from `../helpers.js`
     (`readString`, `streamToArray`).
   - **Web suite** → `tests/web/test-<name>.js`; import the Web wrapper
     (`../../src/web/parser.js`), `{chain}` from `stream-chain/web`, and helpers from
     `../web-helpers.js` (`readWebString`, `drain`, `writeAndCollect`). Web tests must not
     import `node:*` and must use `stream-json/web/assembler.js`, never the Node assembler.
   - Use `test.asPromise('name', (t, resolve, reject) => { ... })` for async stream tests.
   - Use `t.deepEqual()`, `t.equal()`, `t.ok()` for assertions.
   - Comparing raw token streams: map tokens to fresh objects before `t.deepEqual()` — the
     parser emits module-level singletons for structural tokens, and deep6's shared-reference
     handling reports a false negative on repeated references.
4. Test file naming must match `test-*.js`; TypeScript typing tests are `test-*.ts` in
   `tests/node/`. The tape6 config globs `tests/node/` (CLI) and `tests/web/` (browser-shaped)
   separately.
   // turbo
5. Run the full test suite to verify: `npm test`
6. Run the type checks: `npm run ts-check` and `npm run js-check`
7. Report results and any failures.

## stream-csv-as-json conventions

- Three substrates: `src/core/` (substrate-free factories), `src/` (Node wrappers, attach
  `.asStream` + `.asWebStream`), `src/web/` (Web wrappers, `.asWebStream` only). Tests exercise
  the wrappers; the core is covered transitively.
- Common Node pattern: `chain([readString(input), component()])`, collect via `'data'` events,
  verify on `'end'` with `t.deepEqual()`.
- Common Web pattern: `await drain(chain([readWebString(input), component()]))`.
- `readString` accepts a chunk size — sliding-window sizes 1–12 force the parser's incremental
  fallback path off its `charCodeAt` fast path, so keep that coverage when touching the parser.
- `tests/data/sample.csv.gz` is the large fixture (18126 rows) exercising both parser paths.
