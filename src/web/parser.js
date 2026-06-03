// @ts-self-types="./parser.d.ts"

import {asWebStream} from 'stream-chain/web';

import factory from '../core/parser.js';

/** @type {any} */ (factory).asWebStream = options => asWebStream(factory(options), {...options, writableObjectMode: false, readableObjectMode: true});

export default factory;
export {factory as parser};
export * from '../core/parser.js';
