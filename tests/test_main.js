'use strict';

const unit = require('heya-unit');

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const {parser} = require('../index');

const emit = require('stream-json/utils/emit');

const ReadString = require('./ReadString');

unit.add(module, [
  function test_main(t) {
    const async = t.startAsync('test_main');

    const input = '1,,"",""""\r\n2,three,"four",\r\n';

    const pipeline = emit(new ReadString(input).pipe(parser()));

    let values = 0, starts = 0,
      rows = 0;
    pipeline.on('startString', () => ++starts);
    pipeline.on('startArray', () => ++rows);
    pipeline.on('stringValue', () => ++values);
    pipeline.on('end', () => {
      eval(t.TEST('rows === 2'));
      eval(t.TEST('values === 8'));
      eval(t.TEST('values === starts'));
      async.done();
    });
  },
  function test_main_no_values(t) {
    const async = t.startAsync('test_main_no_values');

    const input = '1,,"",""""\r\n2,three,"four",\r\n';

    const pipeline = emit(new ReadString(input).pipe(parser({packStrings: false})));

    let values = 0,
      rows = 0;
    pipeline.on('startString', () => ++values);
    pipeline.on('startArray', () => ++rows);
    pipeline.on('stringValue', () => {
      t.test(false); // we shouldn't be here
    });
    pipeline.on('end', () => {
      eval(t.TEST('rows === 2'));
      eval(t.TEST('values === 8'));
      async.done();
    });
  },
  function test_main_no_streaming(t) {
    const async = t.startAsync('test_main_no_streaming');

    const input = '1,,"",""""\r\n2,three,"four",\r\n';

    const pipeline = emit(new ReadString(input).pipe(parser({streamStrings: false})));

    let values = 0,
      rows = 0;
    pipeline.on('stringValue', () => ++values);
    pipeline.on('startArray', () => ++rows);
    pipeline.on('startString', () => {
      t.test(false); // we shouldn't be here
    });
    pipeline.on('end', () => {
      eval(t.TEST('rows === 2'));
      eval(t.TEST('values === 8'));
      async.done();
    });
  }
]);
