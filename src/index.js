// @ts-self-types="./index.d.ts"

import emit from 'stream-json/utils/emit.js';

import parser from './parser.js';

const make = options => emit(parser.asStream(options));

export default make;
export {make, parser};
