'use strict';

const unit = require('heya-unit');

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
  }
]);
