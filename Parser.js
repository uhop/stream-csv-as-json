'use strict';

const {Transform} = require('stream');

const patterns = {
  value: /^(?:\"|,|\n|\r|[\s\S])/,
  regularValue: /^(?:[^,\r\n]{1,256}|,|\n|\r)/,
  quotedValue: /^(?:[^\"]{1,256}|\")/,
  quotedContinuation: /^(?:\"|,|\n|\r)/
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

    this._separator = (options && options.separator) || ',';
    if (this._separator === ',') {
      this._patterns = patterns;
    } else {
      this._patterns = {};
      const sep = this._separator.replace(/[#-.]|[[-^]|[?|{}]/g, '\\$&'),
        sepOr = '|' + sep + '|',
        sepNot = '[^' + sep;
      Object.keys(patterns).forEach(key => {
        this._patterns[key] = new RegExp(patterns[key].source.replace('|,|', sepOr).replace('[^,', sepNot), noSticky ? '' : 'y');
      });
    }

    this._buffer = '';
    this._expect = 'value1';
    this._expectLF = false;
    this._accumulator = '';
  }

  _transform(chunk, encoding, callback) {
    this._buffer += chunk.toString();
    this._processInput(callback);
  }

  _flush(callback) {
    switch (this._expect) {
      case 'quotedValue':
        return callback(new Error('Parser cannot parse input: expected a quoted value'));
      case 'value1':
        break;
      case 'value':
        if (this._streamStrings) {
          this.push({name: 'startString'});
          this.push({name: 'endString'});
        }
        this._packStrings && this.push({name: 'stringValue', value: ''});
        this.push({name: 'endArray'});
        break;
      default:
        this._streamStrings && this.push({name: 'endString'});
        this._packStrings && this.push({name: 'stringValue', value: this._accumulator});
        this.push({name: 'endArray'});
        break;
    }
    callback(null);
  }

  _processInput(callback) {
    let match,
      value,
      index = 0;
    main: while (index < this._buffer.length) {
      switch (this._expect) {
        case 'value1':
        case 'value':
          this._patterns.value.lastIndex = index;
          match = this._patterns.value.exec(this._buffer);
          if (!match) {
            if (index < this._buffer.length) return callback(new Error('Parser cannot parse input: expected a value'));
            break main; // wait for more input
          }
          value = match[0];
          this._expect === 'value1' && !(value === '\n' && this._expectLF) && this.push({name: 'startArray'});
          switch (value) {
            case '"':
              this._streamStrings && this.push({name: 'startString'});
              this._expect = 'quotedValue';
              break;
            case '\n':
              if (this._expectLF) break;
            // intentional fall down
            case '\r':
              if (this._expect === 'value') {
                if (this._streamStrings) {
                  this.push({name: 'startString'});
                  this.push({name: 'endString'});
                }
                this._packStrings && this.push({name: 'stringValue', value: ''});
              }
              this.push({name: 'endArray'});
              this._expect = 'value1';
              break;
            case this._separator:
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
          this._expectLF = value === '\r';
          if (noSticky) {
            this._buffer = this._buffer.slice(value.length);
          } else {
            index += value.length;
          }
          break;
        case 'regularValue':
          this._patterns.regularValue.lastIndex = index;
          match = this._patterns.regularValue.exec(this._buffer);
          if (!match) {
            if (index < this._buffer.length) return callback(new Error('Parser cannot parse input: a regular value'));
            break main; // wait for more input
          }
          value = match[0];
          switch (value) {
            case this._separator:
              this._streamStrings && this.push({name: 'endString'});
              if (this._packStrings) {
                this.push({name: 'stringValue', value: this._accumulator});
                this._accumulator = '';
              }
              this._expect = 'value';
              break;
            case '\n':
              if (this._expectLF) break;
            // intentional fall down
            case '\r':
              this._streamStrings && this.push({name: 'endString'});
              if (this._packStrings) {
                this.push({name: 'stringValue', value: this._accumulator});
                this._accumulator = '';
              }
              this.push({name: 'endArray'});
              this._expect = 'value1';
              break;
            default:
              this._streamStrings && this.push({name: 'stringChunk', value});
              this._packStrings && (this._accumulator += value);
              break;
          }
          this._expectLF = value === '\r';
          if (noSticky) {
            this._buffer = this._buffer.slice(value.length);
          } else {
            index += value.length;
          }
          break;
        case 'quotedValue':
          this._patterns.quotedValue.lastIndex = index;
          match = this._patterns.quotedValue.exec(this._buffer);
          if (!match) {
            if (index < this._buffer.length) return callback(new Error('Parser cannot parse input: expected a quoted value'));
            break main; // wait for more input
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
          this._patterns.quotedContinuation.lastIndex = index;
          match = this._patterns.quotedContinuation.exec(this._buffer);
          if (!match) {
            if (index < this._buffer.length) return callback(new Error("Parser cannot parse input: expected '\"', a separator, or EOL"));
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
            if (value === this._separator) {
              this._expect = 'value';
            } else {
              this.push({name: 'endArray'});
              this._expect = 'value1';
            }
          }
          this._expectLF = value === '\r';
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
