// @ts-self-types="./stringer.d.ts"

import {asWebStream} from 'stream-chain/web';

import factory from '../core/stringer.js';

/** @type {any} */ (factory).asWebStream = options => asWebStream(factory(options), {...options, writableObjectMode: true, readableObjectMode: false});

export default factory;
export {factory as stringer};
export * from '../core/stringer.js';
