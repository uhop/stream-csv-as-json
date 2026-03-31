---
name: write-tests
description: Write or update tape-six tests for a module or feature. Use when asked to write tests, add test coverage, or create new test files for stream-csv-as-json.
---

# Write Tests for stream-csv-as-json

Write or update tests using the tape-six testing library.

## Steps

1. Identify the module or feature to test. Read its source code to understand the public API.
2. Check existing tests in `tests/` for stream-csv-as-json conventions and patterns.
3. Create or update the test file in `tests/`:
   - ESM tests use `.mjs` extension, CJS tests use `.cjs`, TS tests use `.mts`.
   - `import test from 'tape-six';`
   - `import chain from 'stream-chain';`
   - Import the module under test with relative paths: `import parser from '../src/parser.js';`
   - Use `tests/read-string.mjs` helper for streaming strings in configurable chunks.
   - Use `test.asPromise('name', (t, resolve, reject) => { ... })` for async stream-based tests.
   - Use `t.deepEqual()`, `t.equal()`, `t.ok()` for assertions.
4. Test file naming must match `test-*.mjs` (ESM), `test-*.cjs` (CJS), or `test-*.mts` (TS) — the tape6 config in package.json globs for these patterns.
   // turbo
5. Run the full test suite to verify: `npm test`
6. Run TypeScript type checking: `npm run ts-check`
7. Report results and any failures.

## stream-csv-as-json conventions

- Test file naming: `test-*.mjs` (ESM), `test-*.cjs` (CJS), `test-*.mts` (TS) in `tests/`.
- ESM tests use `import`, CJS tests use `require()`.
- `test.asPromise()` for stream-based async tests with resolve/reject callbacks.
- Common pattern: create a pipeline with `chain([readString(input), component()])`, collect output in an array via `'data'` events, verify on `'end'` with `t.deepEqual()`.
- Use `readString` helper from `tests/read-string.mjs` for testing chunked input at configurable chunk sizes.
- Source modules are in `src/`: `parser.js`, `as-objects.js`, `stringer.js`, `index.js`, `utils/with-parser.js`.
