# stream-csv-as-json [![NPM version][npm-img]][npm-url]

[npm-img]: https://img.shields.io/npm/v/stream-csv-as-json.svg
[npm-url]: https://npmjs.org/package/stream-csv-as-json

`stream-csv-as-json` is a micro-library of stream components for building custom CSV processing pipelines with a minimal memory footprint, on **Node.js or Web Streams**. It can parse CSV files far exceeding available memory, streaming individual primitives using a SAX-inspired API.

`stream-csv-as-json` is a companion project for [stream-json](https://www.npmjs.com/package/stream-json) and [stream-chain](https://www.npmjs.com/package/stream-chain). It uses the **same token protocol** (`{name, value}` tokens) and works seamlessly with `stream-json` filters, streamers, and general infrastructure. This means you can combine CSV parsing with `stream-json` utilities like `streamValues`, `Filter`, `Pick`, and `Ignore` for powerful data processing pipelines.

## Components

- **[parser](https://github.com/uhop/stream-csv-as-json/wiki/parser)** — streaming CSV parser producing a SAX-like token stream.
  - Optionally packs values into single tokens or streams them piece-wise.
  - The [main module](https://github.com/uhop/stream-csv-as-json/wiki/Main-module) provides a convenience factory with event emission.
- **[asObjects](https://github.com/uhop/stream-csv-as-json/wiki/as-objects)** — uses the first row as field names, converts subsequent rows to object tokens.
- **[stringer](https://github.com/uhop/stream-csv-as-json/wiki/stringer)** — converts a CSV token stream back to CSV text.

Every component runs on both substrates: `.asStream()` returns a Node.js `Duplex`, `.asWebStream()` returns a Web `TransformStream`-shaped `{readable, writable}` pair. All components are building blocks for flexible pipelines, combinable with custom functions, [stream-chain](https://www.npmjs.com/package/stream-chain), and [stream-json](https://www.npmjs.com/package/stream-json) utilities.

Full documentation is in the **[wiki](https://github.com/uhop/stream-csv-as-json/wiki)** — browse the [index](https://github.com/uhop/stream-csv-as-json/wiki/Home), or [search it](https://uhop.github.io/wiki-search/app/?wiki=uhop/stream-csv-as-json) by name.

## Installation

```bash
npm install stream-csv-as-json
```

Requires **Node.js 22+**. The package is **ESM-only**.

## Quick start (Node.js)

```js
import fs from 'node:fs';
import zlib from 'node:zlib';
import chain from 'stream-chain';
import {parser} from 'stream-csv-as-json';
import asObjects from 'stream-csv-as-json/as-objects.js';

const pipeline = chain([
  fs.createReadStream('sample.csv.gz'),
  zlib.createGunzip(),
  parser(),
  asObjects(),
  data => {
    if (data.name === 'keyValue' && data.value === 'accounting') return data;
    if (data.name !== 'keyValue') return data;
    return null;
  }
]);

let counter = 0;
pipeline.on('data', data => {
  if (data.name === 'endObject') ++counter;
});
pipeline.on('end', () => console.log(`Found ${counter} matching rows.`));
```

### Quick start (Web Streams)

Import the browser-safe Web entry from `stream-csv-as-json/web` (and `stream-chain/web`). The same component factories build the pipeline — `chain()` wraps them for whichever substrate it was imported from.

```js
import {chain} from 'stream-chain/web';
import parser from 'stream-csv-as-json/web/parser.js';
import asObjects from 'stream-csv-as-json/web/as-objects.js';

const pipeline = chain([response.body.pipeThrough(new TextDecoderStream()), parser(), asObjects()]);

for await (const token of pipeline.readable) {
  if (token.name === 'endObject') console.log('row');
}
```

### Using `.withParser()` for a combined pipeline

```js
import fs from 'node:fs';
import chain from 'stream-chain';
import asObjects from 'stream-csv-as-json/as-objects.js';

const pipeline = chain([fs.createReadStream('data.csv'), asObjects.withParser()]);

pipeline.on('data', token => console.log(token));
```

### Using `.asStream()` / `.asWebStream()` for direct piping

```js
import fs from 'node:fs';
import parser from 'stream-csv-as-json/parser.js';

fs.createReadStream('data.csv')
  .pipe(parser.asStream())
  .on('data', token => console.log(token));
```

## Entry points

**ESM:** the Node entry (`.`) and per-component subpaths carry both `.asStream` and `.asWebStream`; the `/web` entry is browser-safe (no `node:*`); the `/core` entry is the substrate-free factory with no adapters.

```js
// Node-flavored (Duplex + Web adapters attached)
import {parser} from 'stream-csv-as-json';
import asObjects from 'stream-csv-as-json/as-objects.js';
import stringer from 'stream-csv-as-json/stringer.js';

// Web Streams (browser-safe)
import parser from 'stream-csv-as-json/web/parser.js';
import webMake from 'stream-csv-as-json/web';

// Substrate-free factory (no stream adapters)
import parser from 'stream-csv-as-json/core/parser.js';
```

**CommonJS:** the package is ESM-only, but CommonJS consumers can still `require()` it on Node.js ≥ 22.12 (via Node's `require(ESM)`). Destructure the named exports exactly as in the ESM imports above — every default export has a named mirror, so the parser is a named `parser`, not a bare-callable default. See the [migration guide](https://github.com/uhop/stream-csv-as-json/wiki/Migration-from-2.x-to-3.x) for the exact `require()` shape.

## API at a glance

| Module                             | Factory              | Node wrapper                  | Web wrapper                      |
| ---------------------------------- | -------------------- | ----------------------------- | -------------------------------- |
| `stream-csv-as-json`               | `make(options)`      | Duplex with event emission    | —                                |
| `stream-csv-as-json/web`           | `make(options)`      | —                             | `{readable, writable}` pair      |
| `stream-csv-as-json/parser.js`     | `parser(options)`    | `parser.asStream(options)`    | `parser.asWebStream(options)`    |
| `stream-csv-as-json/stringer.js`   | `stringer(options)`  | `stringer.asStream(options)`  | `stringer.asWebStream(options)`  |
| `stream-csv-as-json/as-objects.js` | `asObjects(options)` | `asObjects.asStream(options)` | `asObjects.asWebStream(options)` |

### parser options

| Option                           | Default | Description                                         |
| -------------------------------- | ------- | --------------------------------------------------- |
| `packStrings` / `packValues`     | `true`  | Emit `stringValue` tokens with the complete value   |
| `streamStrings` / `streamValues` | `true`  | Emit `startString`/`stringChunk`/`endString` tokens |
| `separator`                      | `','`   | Field separator character                           |

### stringer options

| Option                          | Default  | Description                                                                 |
| ------------------------------- | -------- | --------------------------------------------------------------------------- |
| `useStringValues` / `useValues` | `false`  | Use packed `stringValue` tokens instead of streamed chunks                  |
| `separator`                     | `','`    | Field separator character                                                   |
| `rowTerminator`                 | `'\r\n'` | Row terminator string. CRLF per RFC 4180; pass `'\n'` for Unix-style output |

### asObjects options

| Option                        | Default   | Description                                   |
| ----------------------------- | --------- | --------------------------------------------- |
| `packKeys` / `packValues`     | `true`    | Emit `keyValue` tokens                        |
| `streamKeys` / `streamValues` | `true`    | Emit `startKey`/`stringChunk`/`endKey` tokens |
| `fieldPrefix`                 | `'field'` | Prefix for unnamed/extra fields               |

> `useStringValues` / `useValues` on `asObjects` are deprecated no-ops kept for backward compatibility — the header collector now auto-detects the parser's mode.

## File components (Node)

Node-only file-edge stages turn a path into a token stream and back, composing stream-chain's async block reader/writer with the core parser/stringer. Drive them with `pipe` + `drain` from `stream-chain/utils` — the writer closes its file handle on flush.

```js
import pipe from 'stream-chain/utils/pipe.js';
import drain from 'stream-chain/utils/drain.js';
import parseFile from 'stream-csv-as-json/file/parser.js';
import stringerToFile from 'stream-csv-as-json/file/stringer.js';

// Round-trip a CSV file:
await drain(pipe(parseFile(), stringerToFile('out.csv', {useValues: true}))('in.csv'));
```

`parseFile(options)` adds `readBlockSize` (default 64 KB); `stringerToFile(path, options)` adds `writeBlockSize` (default 1 MB).

## TypeScript

TypeScript declarations (`.d.ts`) are included for all modules. Tokens are typed as discriminated unions (`parser.Token`, `asObjects.AsObjectsToken`), so narrowing on `token.name` tightens `token.value` per arm.

## License

BSD-3-Clause

## Release history

- 3.0.0 _ESM-native. Web Streams support. Node-only file-edge components (`parseFile`, `stringerToFile`). Improved parser. See the [Migration guide](https://github.com/uhop/stream-csv-as-json/wiki/Migration-from-2.x-to-3.x)._
- 2.1.0 _Configurable `rowTerminator` on `stringer`. `asObjects` header now auto-detects parser mode. Minor bugfixes._
- 2.0.1 _Added direct dependency on `stream-chain`. Documentation updates._
- 2.0.0 _Major rewrite: functional API (stream-chain 3.x), source in `src/`, TypeScript declarations, tape-six tests. See [Migration guide](https://github.com/uhop/stream-csv-as-json/wiki/Migration-from-1.x-to-2.x)._
- 1.0.5 _technical release: updated deps._
- 1.0.4 _technical release: updated deps._
- 1.0.3 _technical release: updated deps._
- 1.0.2 _technical release: updated deps, updated license's year._
- 1.0.1 _minor readme tweaks, added TypeScript typings and the badge._
- 1.0.0 _the first 1.0 release._

The full release notes are in the wiki: [Release notes](https://github.com/uhop/stream-csv-as-json/wiki/Release-notes).
