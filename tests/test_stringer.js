'use strict';

const unit = require('heya-unit');

const {Writable} = require('stream');

const {parser} = require('../Parser');
const {stringer} = require('../Stringer');
const ReadString = require('./ReadString');

const toCsv = array => array.map(row => row.map(value => (/[,\r\n\"]/.test(value) ? '"' + value.replace('"', '""') + '"' : value)).join(',')).join('\r\n');

unit.add(module, [
  function test_stringer_simple(t) {
    const async = t.startAsync('test_stringer_simple');

    let result = '';

    const table = [['1', '', '', '"'], ['2', 'three', 'four', 'five']],
      expected = '"1","","",""""\r\n"2","three","four","five"\r\n',
      pipeline = new ReadString(toCsv(table))
        .pipe(parser())
        .pipe(stringer())
        .pipe(
          new Writable({
            write(chunk, encoding, callback) {
              result += chunk.toString();
              callback(null);
            }
          })
        );

    pipeline.on('finish', () => {
      eval(t.TEST('result === expected'));
      async.done();
    });
  },
  function test_stringer_simple_quoted(t) {
    const async = t.startAsync('test_stringer_simple_quoted');

    let result = '';

    const table = [['1', ',', '', '"'], ['2', 'three\r\n', 'four', 'five']],
      expected = '"1",",","",""""\r\n"2","three\r\n","four","five"\r\n',
      pipeline = new ReadString(toCsv(table))
        .pipe(parser())
        .pipe(stringer())
        .pipe(
          new Writable({
            write(chunk, encoding, callback) {
              result += chunk.toString();
              callback(null);
            }
          })
        );

    pipeline.on('finish', () => {
      eval(t.TEST('result === expected'));
      async.done();
    });
  },
  function test_stringer_values(t) {
    const async = t.startAsync('test_stringer_simple');

    let result = '';

    const table = [['1', '', '', '"'], ['2', 'three', 'four', 'five']],
      expected = '1,,,""""\r\n2,three,four,five\r\n',
      pipeline = new ReadString(toCsv(table))
        .pipe(parser())
        .pipe(stringer({useValues: true}))
        .pipe(
          new Writable({
            write(chunk, encoding, callback) {
              result += chunk.toString();
              callback(null);
            }
          })
        );

    pipeline.on('finish', () => {
      eval(t.TEST('result === expected'));
      async.done();
    });
  },
  function test_stringer_values_quoted(t) {
    const async = t.startAsync('test_stringer_values_quoted');

    let result = '';

    const table = [['1', ',', '', '"'], ['2', 'three\r\n', 'four', 'five']],
      expected = '1,",",,""""\r\n2,"three\r\n",four,five\r\n',
      pipeline = new ReadString(toCsv(table))
        .pipe(parser())
        .pipe(stringer({useValues: true}))
        .pipe(
          new Writable({
            write(chunk, encoding, callback) {
              result += chunk.toString();
              callback(null);
            }
          })
        );

    pipeline.on('finish', () => {
      eval(t.TEST('result === expected'));
      async.done();
    });
  },
  function test_stringer_simple_quoted_separator(t) {
    const async = t.startAsync('test_stringer_simple_quoted_separator');

    let result = '';

    const table = [['1', '|', '', '"'], ['2', 'three\r\n', 'four', 'five']],
      expected = '"1"|"|"|""|""""\r\n"2"|"three\r\n"|"four"|"five"\r\n',
      pipeline = new ReadString(toCsv(table))
        .pipe(parser())
        .pipe(stringer({separator: '|'}))
        .pipe(
          new Writable({
            write(chunk, encoding, callback) {
              result += chunk.toString();
              callback(null);
            }
          })
        );

    pipeline.on('finish', () => {
      eval(t.TEST('result === expected'));
      async.done();
    });
  },
  function test_stringer_values_quoted_separator(t) {
    const async = t.startAsync('test_stringer_values_quoted_separator');

    let result = '';

    const table = [['1', '|', '', '"'], ['2', 'three\r\n', 'four', 'five']],
      expected = '1|"|"||""""\r\n2|"three\r\n"|four|five\r\n',
      pipeline = new ReadString(toCsv(table))
        .pipe(parser())
        .pipe(stringer({useValues: true, separator: '|'}))
        .pipe(
          new Writable({
            write(chunk, encoding, callback) {
              result += chunk.toString();
              callback(null);
            }
          })
        );

    pipeline.on('finish', () => {
      eval(t.TEST('result === expected'));
      async.done();
    });
  },
  function test_stringer_values_quoted_tabbed(t) {
    const async = t.startAsync('test_stringer_values_quoted_tabbed');

    let result = '';

    const table = [['1', '\t', '', '"', ''], ['2', 'three\r\n', 'four', 'five']],
      expected = '1\t"\t"\t\t""""\t\r\n2\t"three\r\n"\tfour\tfive\r\n',
      pipeline = new ReadString(toCsv(table))
        .pipe(parser())
        .pipe(stringer({useValues: true, separator: '\t'}))
        .pipe(
          new Writable({
            write(chunk, encoding, callback) {
              result += chunk.toString();
              callback(null);
            }
          })
        );

    pipeline.on('finish', () => {
      eval(t.TEST('result === expected'));
      async.done();
    });
  }
]);
