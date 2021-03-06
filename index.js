'use strict';

const Parser = require('./Parser');
const emit = require('stream-json/utils/emit');

const make = options => emit(new Parser(options));

make.Parser = Parser;
make.parser = Parser.parser;

module.exports = make;
