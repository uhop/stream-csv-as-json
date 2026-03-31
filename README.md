# stream-csv-as-json [![NPM version][npm-img]][npm-url]

[npm-img]: https://img.shields.io/npm/v/stream-csv-as-json.svg
[npm-url]: https://npmjs.org/package/stream-csv-as-json

`stream-csv-as-json` is a micro-library of Node.js stream components for creating custom CSV processing pipelines with a minimal memory footprint. It can parse CSV files far exceeding available memory, streaming individual primitives using a SAX-inspired API.

`stream-csv-as-json` is a companion project for [stream-json](https://www.npmjs.com/package/stream-json) and [stream-chain](https://www.npmjs.com/package/stream-chain). It uses the same token protocol and works with stream-json filters, streamers, and general infrastructure.

## Components

- **[Parser](https://github.com/uhop/stream-csv-as-json/wiki/Parser)** — streaming CSV parser producing a SAX-like token stream.
  - Optionally packs values into single tokens or streams them piece-wise.
  - The [main module](https://github.com/uhop/stream-csv-as-json/wiki/Main-module) provides a convenience factory with event emission.
- **[AsObjects](https://github.com/uhop/stream-csv-as-json/wiki/AsObjects)** — uses the first row as field names, converts subsequent rows to object tokens.
- **[Stringer](https://github.com/uhop/stream-csv-as-json/wiki/Stringer)** — converts a CSV token stream back to CSV text.

All components are building blocks for flexible pipelines. They can be combined with custom functions, [stream-chain](https://www.npmjs.com/package/stream-chain), and [stream-json](https://www.npmjs.com/package/stream-json) utilities.

## Installation

```bash
npm install stream-csv-as-json
```

## Quick start

```js
const chain = require('stream-chain');
const fs = require('node:fs');
const zlib = require('node:zlib');

const {parser} = require('stream-csv-as-json');
const asObjects = require('stream-csv-as-json/as-objects.js');

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

### Using `.withParser()` for a combined pipeline

```js
const chain = require('stream-chain');
const asObjects = require('stream-csv-as-json/as-objects.js');

const pipeline = chain([fs.createReadStream('data.csv'), asObjects.withParser()]);

pipeline.on('data', token => console.log(token));
```

### Using `.asStream()` for direct piping

```js
const parser = require('stream-csv-as-json/parser.js');

fs.createReadStream('data.csv')
  .pipe(parser.asStream())
  .on('data', token => console.log(token));
```

See the full documentation in the [Wiki](https://github.com/uhop/stream-csv-as-json/wiki).

## API at a glance

| Module                             | Factory              | Stream wrapper                              |
| ---------------------------------- | -------------------- | ------------------------------------------- |
| `stream-csv-as-json`               | `make(options)`      | Returns a Duplex stream with event emission |
| `stream-csv-as-json/parser.js`     | `parser(options)`    | `parser.asStream(options)`                  |
| `stream-csv-as-json/stringer.js`   | `stringer(options)`  | `stringer.asStream(options)`                |
| `stream-csv-as-json/as-objects.js` | `asObjects(options)` | `asObjects.asStream(options)`               |

### Parser options

| Option                           | Default | Description                                         |
| -------------------------------- | ------- | --------------------------------------------------- |
| `packStrings` / `packValues`     | `true`  | Emit `stringValue` tokens with the complete value   |
| `streamStrings` / `streamValues` | `true`  | Emit `startString`/`stringChunk`/`endString` tokens |
| `separator`                      | `','`   | Field separator character                           |

### Stringer options

| Option                          | Default | Description                                                |
| ------------------------------- | ------- | ---------------------------------------------------------- |
| `useStringValues` / `useValues` | `false` | Use packed `stringValue` tokens instead of streamed chunks |
| `separator`                     | `','`   | Field separator character                                  |

### AsObjects options

| Option                          | Default   | Description                                           |
| ------------------------------- | --------- | ----------------------------------------------------- |
| `packKeys` / `packValues`       | `true`    | Emit `keyValue` tokens                                |
| `streamKeys` / `streamValues`   | `true`    | Emit `startKey`/`stringChunk`/`endKey` tokens         |
| `useStringValues` / `useValues` | `false`   | Use packed `stringValue` tokens for header collection |
| `fieldPrefix`                   | `'field'` | Prefix for unnamed/extra fields                       |

## TypeScript

TypeScript declarations (`.d.ts`) are included and provide full type information for all modules.

## License

BSD-3-Clause

## Release history

- 2.0.0 _Major rewrite: functional API (stream-chain 3.x), source in `src/`, TypeScript declarations, tape-six tests. See [Migration guide](https://github.com/uhop/stream-csv-as-json/wiki/Migration)._
- 1.0.5 _technical release: updated deps._
- 1.0.4 _technical release: updated deps._
- 1.0.3 _technical release: updated deps._
- 1.0.2 _technical release: updated deps, updated license's year._
- 1.0.1 _minor readme tweaks, added TypeScript typings and the badge._
- 1.0.0 _the first 1.0 release._
