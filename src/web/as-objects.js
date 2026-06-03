// @ts-self-types="./as-objects.d.ts"

import {asWebStream} from 'stream-chain/web';

import factory from '../core/as-objects.js';
import withParser from './utils/with-parser.js';

/** @type {any} */ (factory).asWebStream = options => asWebStream(factory(options), {...options, writableObjectMode: true, readableObjectMode: true});
/** @type {any} */ (factory).withParser = options => withParser(factory, options);
/** @type {any} */ (factory).withParserAsWebStream = options => withParser.asWebStream(factory, options);

export default factory;
export {factory as asObjects};
export * from '../core/as-objects.js';
