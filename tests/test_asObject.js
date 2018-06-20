'use strict';

const unit = require('heya-unit');

const Assembler = require('stream-json/Assembler');

const {parser} = require('../Parser');
const {asObjects} = require('../AsObjects');
const ReadString = require('./ReadString');

unit.add(module, [
  function test_asObject_simple(t) {
    const async = t.startAsync('test_asObject_simple');

    const input = 'alpha,beta,gamma\r\n1,,"",""""\r\n2,three,"four",five\r\n',
      expected = [{alpha: '1', beta: '', gamma: '', field3: '"'}, {alpha: '2', beta: 'three', gamma: 'four', field3: 'five'}],
      result = [];

    const pipeline = new ReadString(input).pipe(parser()).pipe(asObjects());
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
  function test_asObject_values(t) {
    const async = t.startAsync('test_asObject_values');

    const input = 'alpha,beta,gamma\r\n1,,"",""""\r\n2,three,"four",five\r\n',
      expected = [{alpha: '1', beta: '', gamma: '', field3: '"'}, {alpha: '2', beta: 'three', gamma: 'four', field3: 'five'}],
      result = [];

    const pipeline = new ReadString(input).pipe(parser({useValues: true})).pipe(asObjects());
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
