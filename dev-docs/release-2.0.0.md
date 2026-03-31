# New major release: 2.0.0

Sister project of `stream-json` (`../stream-json/`), built on `stream-chain` (`../stream-chain/`) and select `stream-json` utilities.

## Changes

`stream-json` 2.x has been released with a major refactor. This project should adopt the same patterns:

- Upgrade `stream-chain` and `stream-json` dependencies.
- Use the new `stream-json` API.
- Mirror `stream-json` 2.x code structure where it makes sense:
  - `Parser.js` — analogue of `stream-json`'s `parser.js`.
  - `Stringer.js` — analogue of `stream-json`'s `stringer.js`.
  - `AsObjects.js` — adapter for `stream-json` streamer utilities.
- Move all source from the project root into `src/`.
  - Update `exports` in `package.json` to reflect the new paths.
  - Add `.d.ts` typings with embedded JSDoc, matching `stream-json`'s approach.
  - Add required TS infrastructure (`tsconfig.json`, `ts-check` script).
- Switch tests from `heya-unit` to `tape-six`, mirroring `stream-json`:
  - `.mjs` for runtime tests, `.mts` for typing-only TS tests.
  - One `.cjs` test to verify CommonJS usage.
  - All functionality tested by JS tests; TS tests cover types only.
  - Verify test coverage; fill any gaps.
- Update all documentation:
  - `README.md`
  - `wiki/` pages
  - AI-facing docs (`AGENTS.md`, `ARCHITECTURE.md`, `llms.txt`, `llms-full.txt`, rule files)
  - Add a `wiki/` migration guide (1.x → 2.x).

## Implementation plan

### Phase 1 — Dependencies

Update `package.json`:

| Field                           | 1.x      | 2.x                                         |
| ------------------------------- | -------- | ------------------------------------------- |
| `dependencies.stream-json`      | `^1.8.0` | `^2.1.0`                                    |
| `devDependencies.stream-chain`  | `^2.2.5` | (remove — now transitive via `stream-json`) |
| `devDependencies.heya-unit`     | `^0.3.0` | (remove)                                    |
| `devDependencies.tape-six`      | —        | `^1.7.13`                                   |
| `devDependencies.tape-six-proc` | —        | `^1.2.8`                                    |
| `devDependencies.typescript`    | —        | `^6.0.2`                                    |
| `devDependencies.@types/node`   | —        | `^25.5.0`                                   |
| `devDependencies.prettier`      | —        | `^3.8.1`                                    |

Add `"type": "commonjs"` explicitly. Add `"funding"` field.

### Phase 2 — Source rewrite

Move all source into `src/` and adopt `stream-chain` 3.x functional style.

**Filename mapping** (PascalCase → lowercase to match `stream-json`):

| 1.x (root)     | 2.x (`src/`)        |
| -------------- | ------------------- |
| `index.js`     | `src/index.js`      |
| `Parser.js`    | `src/parser.js`     |
| `AsObjects.js` | `src/as-objects.js` |
| `Stringer.js`  | `src/stringer.js`   |

Each file gets a `// @ts-self-types="./foo.d.ts"` header.

#### `src/parser.js`

Convert from a `Transform` class to the `stream-chain` functional pattern:

```
const csvParser = options => flushable(buf => { ... return many(tokens) or none; });
const parser = options => gen(fixUtf8Stream(), csvParser(options));
parser.asStream = options => asStream(parser(options), options);
```

Key changes:

- Replace class-based `_transform`/`_flush` with a `flushable()` closure.
- Use `many(tokens)` / `none` return values instead of `this.push()`.
- Use `buf === none` to detect flush.
- Wrap with `fixUtf8Stream()` via `gen()` for correct multi-byte handling.
- Expose `parser.asStream()` for `.pipe()` usage.
- Export `parser` as default + `parser.parser` for destructuring.
- The sticky-RegExp fallback can likely be dropped (Node 20+ guaranteed); confirm and simplify.

#### `src/stringer.js`

Convert from a `Transform` class to `flushable()` + `asStream()`:

```
const stringer = options => flushable(chunk => { ... return text or none; });
stringer.asStream = options => asStream(stringer(options), {...options, writableObjectMode: true, readableObjectMode: false});
```

Key changes:

- Replace `_transform` / `_valueTransform` / `_skipString` with a single closure using `skip` state.
- Adopt `stream-json`'s quoting approach (the Stringer handles CSV-specific quoting, not JSON escaping).
- Export `stringer` as default + `stringer.stringer`.

#### `src/as-objects.js`

Convert from a `Transform` class to a function returning a `flushable()`:

```
const asObjects = options => flushable(chunk => { ... return many(tokens) or none; });
asObjects.asStream = options => asStream(asObjects(options), {...options, writableObjectMode: true, readableObjectMode: true});
```

Add `withParser` and `withParserAsStream` using the CSV parser:

```
const withParser = require('./utils/with-parser.js');
asObjects.withParser = options => withParser(asObjects, options);
asObjects.withParserAsStream = options => withParser.asStream(asObjects, options);
```

Export `asObjects` as default + `asObjects.asObjects`.

#### `src/index.js`

```js
const parser = require('./parser.js');
const emit = require('stream-json/utils/emit.js');
const make = options => emit(parser.asStream(options));
module.exports = make;
module.exports.parser = parser;
```

#### `src/utils/with-parser.js`

Local copy adapted for the CSV parser (imports `../parser.js` instead of `stream-json`'s parser):

```js
const {asStream: makeStream, gen} = require('stream-chain');
const parser = require('../parser.js');
const withParser = (fn, options) => gen(parser(options), fn(options));
const asStream = (fn, options) => makeStream(withParser(fn, options), {...options, writableObjectMode: false, readableObjectMode: true});
module.exports = withParser;
module.exports.asStream = asStream;
```

### Phase 3 — `package.json` updates

```jsonc
{
  "main": "./src/index.js",
  "types": "./src/index.d.ts",
  "exports": {
    ".": "./src/index.js",
    "./*": "./src/*"
  },
  "files": ["src", "LICENSE", "README.md", "llms.txt", "llms-full.txt"],
  "scripts": {
    "test": "tape6 --flags FO",
    "test:proc": "tape6-proc --flags FO",
    "ts-check": "tsc --noEmit",
    "lint": "prettier --check .",
    "lint:fix": "prettier --write ."
  },
  "tape6": {
    "tests": ["/tests/test-*.*js"]
  }
}
```

### Phase 4 — TypeScript declarations

Create `.d.ts` files with embedded JSDoc for each module:

| File                         | Exports                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/parser.d.ts`            | `parser()`, `parser.asStream()`, `ParserOptions`, `Token`                                           |
| `src/stringer.d.ts`          | `stringer()`, `stringer.asStream()`, `StringerOptions`                                              |
| `src/as-objects.d.ts`        | `asObjects()`, `asObjects.asStream()`, `.withParser()`, `.withParserAsStream()`, `AsObjectsOptions` |
| `src/index.d.ts`             | `make()`, `make.parser`                                                                             |
| `src/utils/with-parser.d.ts` | `withParser()`, `withParser.asStream()`                                                             |

Add `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "node16",
    "moduleResolution": "node16",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": false
  },
  "include": ["src/**/*.d.ts", "tests/**/*.mts"]
}
```

### Phase 5 — Tests

Replace `heya-unit` tests with `tape-six` tests.

**Test file mapping:**

| 1.x                      | 2.x                              | Format         |
| ------------------------ | -------------------------------- | -------------- |
| `tests/tests.js`         | (remove — tape6 discovers tests) | —              |
| `tests/ReadString.js`    | `tests/read-string.mjs`          | ESM helper     |
| `tests/test_parser.js`   | `tests/test-parser.mjs`          | ESM            |
| `tests/test_sliding.js`  | `tests/test-sliding.mjs`         | ESM            |
| `tests/test_main.js`     | `tests/test-main.mjs`            | ESM            |
| `tests/test_stringer.js` | `tests/test-stringer.mjs`        | ESM            |
| `tests/test_asObject.js` | `tests/test-as-objects.mjs`      | ESM            |
| —                        | `tests/test-cjs.cjs`             | CJS smoke test |
| —                        | `tests/test-types.mts`           | TS typing test |

Conventions (mirror `stream-json`):

- `import test from 'tape-six';`
- `test.asPromise('name', (t, resolve, reject) => { ... })` for stream tests.
- Use `chain()` from `stream-chain` for pipeline tests.
- `read-string.mjs` as ESM helper (same pattern as `stream-json`).
- `test-cjs.cjs` verifies all `require()` paths work.
- `test-types.mts` verifies `.d.ts` types compile and are correct.

Coverage checklist:

- Parser: streaming tokens, packed tokens, pack-only, stream-only, custom separator, quoted fields, embedded newlines, embedded quotes, `\r\n` vs `\n`, flush behavior, empty fields, empty input.
- Stringer: stream mode round-trip, value mode round-trip, custom separator, quoting logic.
- AsObjects: header extraction, object conversion, fieldPrefix, pack/stream keys, useStringValues, extra columns, withParser pipeline.
- Main module: event emission, full pipeline with gzipped sample.
- Sliding: chunked input at various quant sizes.

### Phase 6 — Documentation

- **`README.md`**: Update imports, examples, API description to reflect new paths (`src/`), new factory style, 2.x deps.
- **`wiki/`**: Update `Parser.md`, `Stringer.md`, `AsObjects.md`, `Main-module.md`, `Home.md` for new API.
- **`wiki/Migration.md`** (new): Breaking changes guide:
  - Import paths changed (root → `src/`, PascalCase → lowercase).
  - Class constructors → factory functions + `.asStream()`.
  - `stream-json` 2.x / `stream-chain` 3.x required.
  - Test framework changed (only relevant for contributors).

### Phase 7 — AI docs

Update all AI-facing files (run `/ai-docs-update` workflow):

- `AGENTS.md`, `ARCHITECTURE.md`
- `llms.txt`, `llms-full.txt`
- `.windsurfrules`, `.cursorrules`, `.clinerules`
- `.github/COPILOT-INSTRUCTIONS.md`, `CLAUDE.md` (pointers — likely no change)

### Phase 8 — Verification

```bash
npm test              # tape-six full suite
npm run ts-check      # TypeScript declarations
npm run lint          # Prettier
npm pack --dry-run    # Verify package contents
```

### Execution order

1. Phase 1 (deps) + Phase 3 (package.json) — get infrastructure in place.
2. Phase 2 (source rewrite) — one file at a time: parser → stringer → as-objects → with-parser → index.
3. Phase 4 (`.d.ts` files) — create alongside each source file.
4. Phase 5 (tests) — rewrite tests; run after each module is ported.
5. Phase 8 (verify) — confirm everything works.
6. Phase 6 + 7 (docs) — update last, once API is stable.

## Future work

Address bugs, improvement opportunities, and performance optimizations as they arise.
