'use strict';

const {Transform} = require('stream');

const prohibitedSsymbols = {
    startObject: 1,
    endObject: 1,
    startKey: 1,
    endKey: 1,
    startNumber: 1,
    numberChunk: 1,
    endNumber: 1,
    keyValue: 1,
    numberValue: 1,
    nullValue: 1,
    trueValue: 1,
    falseValue: 1
  };

const skipValue = endName =>
  function(chunk, encoding, callback) {
    if (chunk.name === endName) {
      this._transform = this._prev_transform;
    }
    callback(null);
  };

class Stringer extends Transform {
  static make(options) {
    return new Stringer(options);
  }

  constructor(options) {
    super(Object.assign({}, options, {writableObjectMode: true, readableObjectMode: false}));

    this._useStringValues = false;
    this._separator = ',';
    this._containsQuotables = /[,\r\n\"]/;
    if (options) {
      'useValues' in options && (this._useStringValues = options.useValues);
      'useStringValues' in options && (this._useStringValues = options.useStringValues);
      this._separator = options.separator || ',';
      const sep = this._separator.replace(/[#-.]|[[-^]|[?|{}]/g, '\\$&')
      this._containsQuotables = new RegExp(this._containsQuotables.source.replace('[,', '[' + sep));
    }

    if (this._useStringValues) {
      this._transform = this._valueTransform;
    }
  }

  _transform(chunk, _, callback) {
    switch (chunk.name) {
      case 'startArray':
        this._skipSeparator = true;
        break;
      case 'endArray':
        this.push('\r\n');
        break;
      case 'startString':
        if (this._skipSeparator) {
          this._skipSeparator = false;
        } else {
          this.push(this._separator);
        }
        // intentional fall through
      case 'endString':
        this.push('"');
        break;
      case 'stringChunk':
        this.push(chunk.value.replace('"', '""'));
        break;
      case 'stringValue':
        break; // skip
      default:
        return callback(new Error('Unexpected token: ' + chunk.name));
    }
    callback(null);
  }

  _valueTransform(chunk, _, callback) {
    switch (chunk.name) {
      case 'startArray':
        this._skipSeparator = true;
        break;
      case 'endArray':
        this.push('\r\n');
        break;
      case 'stringValue':
        if (this._skipSeparator) {
          this._skipSeparator = false;
        } else {
          this.push(',');
        }
        const value = chunk.value;
        if (this._containsQuotables.test(value)) {
          this.push('"' + value.replace('"', '""') + '"');
        } else {
          this.push(value);
        }
        break;
      case 'startString':
      case 'stringChunk':
      case 'endString':
        break; // skip
      default:
        return callback(new Error('Unexpected token: ' + chunk.name));
    }
    callback(null);
  }
}
Stringer.stringer = Stringer.make;
Stringer.make.Constructor = Stringer;

module.exports = Stringer;
