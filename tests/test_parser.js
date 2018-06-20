'use strict';

const unit = require('heya-unit');

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const {chain} = require('stream-chain');

const Assembler = require('stream-json/Assembler');

const Parser = require('../Parser');
const ReadString = require('./ReadString');

unit.add(module, [
  function test_parser_simple(t) {
    const async = t.startAsync('test_parser_simple');

    const input = '1,,"",""""\r\n2,three,"four",five\r\n',
      expected = [['1', '', '', '"'], ['2', 'three', 'four', 'five']],
      result = [];

    const pipeline = new ReadString(input).pipe(new Parser());
    const asm = new Assembler();

    pipeline.on('data', token => {
      asm[token.name] && asm[token.name](token.value);
      asm.done && result.push(asm.current);
    });
    pipeline.on('end', () => {
      eval(t.TEST('t.unify(result, expected)'));
      async.done();
    });
  },
  function test_parser_tricky_values(t) {
    const async = t.startAsync('test_parser_tricky_values');

    const pipeline = chain([fs.createReadStream(path.resolve(__dirname, 'sample.csv.gz')), zlib.createGunzip(), new Parser()]);

    let rows = 0,
      empties = 0,
      valuesWithCrLf = 0,
      valuesWithDoubleQuote = 0;
    pipeline.on('data', data => {
      if (data.name === 'startArray') {
        ++rows;
        return;
      }
      if (data.name === 'stringValue') {
        const value = data.value;
        if (value) {
          if (/[\u000A\u000D]/.test(value)) {
            ++valuesWithCrLf;
          }
          if (/"/.test(value)) {
            ++valuesWithDoubleQuote;
          }
        } else {
          ++empties;
        }
      }
    });
    pipeline.on('end', () => {
      eval(t.TEST('rows === 18127'));
      eval(t.TEST('empties === 158989'));
      eval(t.TEST('valuesWithCrLf === 1'));
      eval(t.TEST('valuesWithDoubleQuote === 1'));
      async.done();
    });
  }
]);
