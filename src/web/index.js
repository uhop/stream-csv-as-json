// @ts-self-types="./index.d.ts"

import parser from './parser.js';

const make = parser.asWebStream;

export default make;
export {make, parser};
