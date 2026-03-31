// @ts-self-types="./with-parser.d.ts"

'use strict';

const {asStream: makeStream} = require('stream-chain');
const gen = require('stream-chain/gen.js');

const parser = require('../parser.js');

const withParser = (fn, options) => gen(parser(options), fn(options));

const asStream = (fn, options) => makeStream(withParser(fn, options), {...options, writableObjectMode: false, readableObjectMode: true});

module.exports = withParser;
module.exports.asStream = asStream;
