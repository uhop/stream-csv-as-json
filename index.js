'use strict';

const Parser = require('./Parser');

const make = options => new Parser(options);

make.Parser = Parser;
make.parser = Parser.parser;

module.exports = make;
