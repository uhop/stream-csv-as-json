'use strict';

const {Transform} = require('stream');

const patterns = {
  value: /^(?:\"|,|\n|\r\n|\r|[\s\S])/,
  regularValue: /^(?:[^,\r\n]{1,256}|,|\n|\r\n|\r)/,
  quotedValue: /^(?:[^\"]{1,256}|\")/,
  quotedContinuation: /^(?:\"|,|\n|\r\n|\r)/
};

let noSticky = true;
try {
  new RegExp('.', 'y');
  noSticky = false;
} catch (e) {
  // suppress
}

!noSticky &&
  Object.keys(patterns).forEach(key => {
    let src = patterns[key].source.slice(1); // lop off ^
    if (src.slice(0, 3) === '(?:' && src.slice(-1) === ')') {
      src = src.slice(3, -1);
    }
    patterns[key] = new RegExp(src, 'y');
  });

const eol = {'\r': 1, '\n': 1, '\r\n': 1};

class Parser extends Transform {
  static make(options) {
    return new Parser(options);
  }

  constructor(options) {
    super(Object.assign({}, options, {writableObjectMode: false, readableObjectMode: true}));

    this._packStrings = this._streamStrings = true;
    if (options) {
      'packValues' in options && (this._packStrings = options.packValues);
      'packStrings' in options && (this._packStrings = options.packStrings);
      'streamValues' in options && (this._streamStrings = options.streamValues);
      'streamStrings' in options && (this._streamStrings = options.streamStrings);
    }
    !this._packStrings && (this._streamStrings = true);

    this._buffer = '';
    this._done = false;
    this._startRow = true;
    this._expect = 'value';
    this._accumulator = '';
  }

  _transform(chunk, encoding, callback) {
    this._buffer += chunk.toString();
    this._processInput(callback);
  }

  _flush(callback) {
    this._done = true;
    this._processInput(callback);
  }

  _processInput(callback) {
    let match,
      value,
      index = 0;
    main: for (;;) {
      switch (this._expect) {
        case 'value':
          patterns.value.lastIndex = index;
          match = patterns.value.exec(this._buffer);
          if (!match) {
            if (index < this._buffer.length) {
              if (this._done) {
                return callback(new Error('Parser cannot parse input: expected a value'));
              }
            }
            break main; // wait for more input
          }
          value = match[0];
          if (this._startRow) {
            this._startRow = false;
            this.push({name: 'startArray'});
          }
          switch (value) {
            case '"':
              this._streamStrings && this.push({name: 'startString'});
              this._expect = 'quotedValue';
              break;
            case '\r':
            case '\n':
            case '\r\n':
              this.push({name: 'endArray'});
              this._startRow = true;
              this._expect = 'value';
              break;
            case ',':
              if (this._streamStrings) {
                this.push({name: 'startString'});
                this.push({name: 'endString'});
              }
              this._packStrings && this.push({name: 'stringValue', value: ''});
              this._expect = 'value';
              break;
            default:
              if (this._streamStrings) {
                this.push({name: 'startString'});
                this.push({name: 'stringChunk', value});
              }
              this._packStrings && (this._accumulator = value);
              this._expect = 'regularValue';
              break;
          }
          if (noSticky) {
            this._buffer = this._buffer.slice(value.length);
          } else {
            index += value.length;
          }
          break;
        case 'regularValue':
          patterns.regularValue.lastIndex = index;
          match = patterns.regularValue.exec(this._buffer);
          if (!match) {
            if (index < this._buffer.length) {
              if (this._done || this._buffer.length - index >= 6) {
                return callback(new Error('Parser cannot parse input: a regular value'));
              }
            }
            if (this._done) {
              return callback(new Error('Parser has expected a regular value'));
            }
            break main; // wait for more input
          }
          value = match[0];
          if (value === ',' || eol[value] === 1) {
            this._streamStrings && this.push({name: 'endString'});
            if (this._packStrings) {
              this.push({name: 'stringValue', value: this._accumulator});
              this._accumulator = '';
            }
            this._expect = 'value';
            if (value !== ',') {
              this.push({name: 'endArray'});
              this._startRow = true;
            }
          } else {
            this._streamStrings && this.push({name: 'stringChunk', value});
            this._packStrings && (this._accumulator += value);
          }
          if (noSticky) {
            this._buffer = this._buffer.slice(value.length);
          } else {
            index += value.length;
          }
          break;
        case 'quotedValue':
          patterns.quotedValue.lastIndex = index;
          match = patterns.quotedValue.exec(this._buffer);
          if (!match) {
            if (index < this._buffer.length || this._done) {
              return callback(new Error('Parser cannot parse input: expected a quoted value'));
            }
            // wait for more input
            break main;
          }
          value = match[0];
          if (value === '"') {
            this._expect = 'quotedContinuation';
          } else {
            this._streamStrings && this.push({name: 'stringChunk', value});
            this._packStrings && (this._accumulator += value);
          }
          if (noSticky) {
            this._buffer = this._buffer.slice(value.length);
          } else {
            index += value.length;
          }
          break;
        case 'quotedContinuation':
          patterns.quotedContinuation.lastIndex = index;
          match = patterns.quotedContinuation.exec(this._buffer);
          if (!match) {
            if (index < this._buffer.length || this._done) {
              return callback(new Error("Parser cannot parse input: expected '\"', ',', or EOL"));
            }
            break main; // wait for more input
          }
          value = match[0];
          if (value === '"') {
            this._streamStrings && this.push({name: 'stringChunk', value: '"'});
            this._packStrings && (this._accumulator += '"');
            this._expect = 'quotedValue';
          } else {
            this._streamStrings && this.push({name: 'endString'});
            if (this._packStrings) {
              this.push({name: 'stringValue', value: this._accumulator});
              this._accumulator = '';
            }
            if (value !== ',') {
              this.push({name: 'endArray'});
              this._startRow = true;
            }
            this._expect = 'value';
          }
          if (noSticky) {
            this._buffer = this._buffer.slice(value.length);
          } else {
            index += value.length;
          }
          break;
      }
    }
    if (!noSticky && index) {
      this._buffer = this._buffer.slice(index);
    }
    callback(null);
  }
}
Parser.parser = Parser.make;
Parser.make.Constructor = Parser;

module.exports = Parser;
