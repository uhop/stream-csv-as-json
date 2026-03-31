---
name: write-tests
description: Write or update heya-unit tests for a module or feature. Use when asked to write tests, add test coverage, or create new test files for stream-csv-as-json.
---

# Write Tests for stream-csv-as-json

Write or update tests using the heya-unit testing library.

## Steps

1. Identify the module or feature to test. Read its source code to understand the public API.
2. Check existing tests in `tests/` for stream-csv-as-json conventions and patterns.
3. Create or update the test file in `tests/`:
   - CommonJS throughout (`.js` files).
   - `const unit = require('heya-unit');`
   - Import the module under test with relative paths: `const Parser = require('../Parser');`
   - Use `tests/ReadString.js` helper for streaming strings in configurable chunks.
   - Register tests with `unit.add(module, [...])`.
   - Use `t.startAsync('name')` for async stream-based tests, call `async.done()` when complete.
   - Use `eval(t.TEST('expression'))` for assertions.
4. If creating a new test file, add `require('./test_<name>')` to `tests/tests.js`.
   // turbo
5. Run the new test file directly to verify: `node tests/test_<name>.js`
6. Run the full test suite to check for regressions: `npm test`
7. Report results and any failures.

## stream-csv-as-json conventions

- Test file naming: `test_*.js` in `tests/`.
- CommonJS throughout: `require()` / `module.exports`.
- Tests use `unit.add(module, [function test_name(t) { ... }])`.
- Stream-based tests use `t.startAsync('name')` and `async.done()`.
- Common pattern: create a parser/pipeline, collect output in an array via `'data'` events, verify on `'end'`.
- Use `ReadString` helper from `tests/ReadString.js` for testing chunked input.
