# stream-csv-as-json [![NPM version][npm-img]][npm-url]

[npm-img]: https://img.shields.io/npm/v/stream-csv-as-json.svg
[npm-url]: https://npmjs.org/package/stream-csv-as-json

`stream-csv-as-json` is a micro-library of node.js stream components with minimal dependencies for creating custom data processors oriented on processing huge CSV files while requiring a minimal memory footprint. It can parse CSV files far exceeding available memory. Even individual primitive data items can be streamed piece-wise. Streaming SAX-inspired event-based API is included as well.

`stream-csv-as-json` is a companion project for [stream-json](https://www.npmjs.com/package/stream-json) and it is meant to be used with its filters, streamers and general infrastructure.

Available components:

* Streaming JSON [Parser](https://github.com/uhop/stream-csv-as-json/wiki/Parser).
  * It produces a SAX-like token stream.
  * Optionally it can pack individual values.
  * The [main module](https://github.com/uhop/stream-csv-as-json/wiki/Main-module) provides helpers to create a parser.
* Essentials:
  * [AsObjects](https://github.com/uhop/stream-csv-as-json/wiki/AsObjects) uses the first row as a list of field names and produces rows as shallow objects with named fields.
  * [Stringer](https://github.com/uhop/stream-csv-as-json/wiki/Stringer) converts a token stream back into a JSON text stream.

All components are meant to be building blocks to create flexible custom data processing pipelines. They can be extended and/or combined with custom code. They can be used together with [stream-chain](https://www.npmjs.com/package/stream-chain) and [stream-json](https://www.npmjs.com/package/stream-json) to simplify data processing.

This toolkit is distributed under New BSD license.

## Introduction

```js
const {chain}  = require('stream-chain');

const {parser} = require('stream-csv-as-json');
const {asObjects} = require('stream-csv-as-json/AsObjects');
const {StreamValues} = require('stream-json/streamers/StreamValues');

const fs   = require('fs');
const zlib = require('zlib');

const pipeline = chain([
  fs.createReadStream('sample.csv.gz'),
  zlib.createGunzip(),
  parser(),
  asObjects(),
  streamValues(),
  data => {
    const value = data.value;
    return value && value.department === 'accounting' ? data : null;
  }
]);

let counter = 0;
pipeline.on('data', () => ++counter);
pipeline.on('end', () =>
  console.log(`The accounting department has ${counter} employees.`));
```

See the full documentation in [Wiki](https://github.com/uhop/stream-csv-as-json/wiki).

## Installation

```bash
npm install --save stream-csv-as-json
# or:
yarn add stream-csv-as-json
```

## Use

The whole library is organized as a set of small components, which can be combined to produce the most effective pipeline. All components are based on node.js [streams](http://nodejs.org/api/stream.html), and [events](http://nodejs.org/api/events.html). They implement all required standard APIs. It is easy to add your own components to solve your unique tasks.

The code of all components is compact and simple. Please take a look at their source code to see how things are implemented, so you can produce your own components in no time.

Obviously, if a bug is found, or a way to simplify existing components, or new generic components are created, which can be reused in a variety of projects, don't hesitate to open a ticket, and/or create a pull request.

## License

BSD-3-Clause

## Release History

- 1.0.5 *technical release: updated deps.*
- 1.0.4 *technical release: updated deps.*
- 1.0.3 *technical release: updated deps.*
- 1.0.2 *technical release: updated deps, updated license's year.*
- 1.0.1 *minor readme tweaks, added TypeScript typings and the badge.*
- 1.0.0 *the first 1.0 release.*
