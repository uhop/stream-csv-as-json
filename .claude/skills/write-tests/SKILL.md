---
name: write-tests
description:
  Write or update tape-six tests for a module or feature. Use when asked to write tests, add test coverage, or create new test files for stream-csv-as-json.
---

# Write Tests for stream-csv-as-json

Follow the tape-six skill and testing guide, then this project's conventions:

1. Read `node_modules/tape-six/skills/write-tests/SKILL.md` for the steps, the assertions, and how to judge a run.
2. Read `node_modules/tape-six/TESTING.md` for the API reference and patterns.
3. Follow the project conventions in `AGENTS.md` and the ones below. Where they differ from the shipped skill (test locations, helpers), these win.

## stream-csv-as-json conventions

- Every component has a Node-substrate suite and a Web-substrate mirror; a new component needs both.
  - **Node suite**: `tests/node/test-<name>.js`. Import the Node wrapper (`../../src/parser.js`), `chain` from `stream-chain`, and helpers from `../helpers.js`
    (`readString`, `streamToArray`).
  - **Web suite**: `tests/web/test-<name>.js`. Import the Web wrapper (`../../src/web/parser.js`), `{chain}` from `stream-chain/web`, and helpers from
    `../web-helpers.js` (`readWebString`, `drain`, `writeAndCollect`). Web tests must not import `node:*` and must use `stream-json/web/assembler.js`, never the
    Node assembler.
  - TypeScript typing tests are `test-*.ts` in `tests/node/`, run by `npm run ts-test` and checked by `npm run ts-check`.
- Three substrates: `src/core/` (substrate-free factories), `src/` (Node wrappers, attach `.asStream` + `.asWebStream`), `src/web/` (Web wrappers,
  `.asWebStream` only). Tests exercise the wrappers. When a test needs exact chunk boundaries, drive the tokenizer directly: call `csvParser()` with each string
  chunk and then `none`, and spread `getManyValues(result)` from `stream-chain/core`.
- Common Node pattern: `chain([readString(input), component()])`, collect via `'data'` events, verify on `'end'` with `t.deepEqual()`. Common Web pattern:
  `await drain(chain([readWebString(input), component()]))`.
- Comparing raw token streams: map tokens to fresh objects before `t.deepEqual()`. The parser emits module-level singletons for structural tokens, and deep6's
  shared-reference handling reports a false negative on repeated references.
- `readString` accepts a chunk size: sliding-window sizes 1–12 force the parser's incremental fallback path off its `charCodeAt` fast path, so keep that
  coverage when touching the parser. `readString(Buffer.from(text), 1)` feeds bytes one at a time through the UTF-8 decoder.
- Build invisible and unpaired characters in code, never as literals: `String.fromCharCode(0xfeff)` for a byte-order mark, `String.fromCodePoint(0x1f600)` and
  its `charAt(0)` / `charAt(1)` for a surrogate pair and its halves. A raw U+FEFF is invisible in a diff, and a lone surrogate cannot be stored in a UTF-8 file.
- `tests/data/sample.csv.gz` is the large fixture (18126 rows) exercising both parser paths.
- Gate: `npm test`, `npm run ts-test`, `npm run ts-check`, `npm run js-check`, and `npm run lint`, each judged by its exit status.
