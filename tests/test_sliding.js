'use strict';

const unit = require('heya-unit');

const Assembler = require('stream-json/Assembler');

const Parser = require('../Parser');
const ReadString = require('./ReadString');

const runSlidingWindowTest = (t, quant) => {
  const async = t.startAsync('test_sliding: ' + quant);

  const table = [['1', '', '', '"'], ['2', 'three', 'four', 'five']],
    input = table.map(row => row.map(value => (/[\r\n\"]/.test(value) ? '"' + value.replace('"', '""') + '"' : value)).join(',')).join('\r\n'),
    pipeline = new ReadString(input, quant).pipe(new Parser()),
    asm = new Assembler(),
    result = [];

  pipeline.on('data', token => {
    asm[token.name] && asm[token.name](token.value);
    asm.done && result.push(asm.current);
  });
  pipeline.on('end', () => {
    eval(t.TEST('t.unify(result, table)'));
    async.done();
  });
};

unit.add(module, [
  function test_sliding_1(t) {
    runSlidingWindowTest(t, 1);
  },
  function test_sliding_2(t) {
    runSlidingWindowTest(t, 2);
  },
  function test_sliding_3(t) {
    runSlidingWindowTest(t, 3);
  },
  function test_sliding_4(t) {
    runSlidingWindowTest(t, 4);
  },
  function test_sliding_5(t) {
    runSlidingWindowTest(t, 5);
  },
  function test_sliding_6(t) {
    runSlidingWindowTest(t, 6);
  },
  function test_sliding_7(t) {
    runSlidingWindowTest(t, 7);
  },
  function test_sliding_8(t) {
    runSlidingWindowTest(t, 8);
  },
  function test_sliding_9(t) {
    runSlidingWindowTest(t, 9);
  },
  function test_sliding_10(t) {
    runSlidingWindowTest(t, 10);
  },
  function test_sliding_11(t) {
    runSlidingWindowTest(t, 11);
  },
  function test_sliding_12(t) {
    runSlidingWindowTest(t, 12);
  }
]);
