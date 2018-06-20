'use strict';

const {Transform} = require('stream');

class AsObjects extends Transform {
  static make(options) {
    return new AsObjects(options);
  }

  constructor(options) {
    super(Object.assign({}, options, {writableObjectMode: true, readableObjectMode: true}));

    this._fieldPrefix = 'field';
    this._useStringValues = false;
    this._packKeys = this._streamKeys = true;
    if (options) {
      'packValues' in options && (this._packStrings = options.packValues);
      'packKeys' in options && (this._packKeys = options.packKeys);
      'streamValues' in options && (this._streamStrings = options.streamValues);
      'streamKeys' in options && (this._streamKeys = options.streamKeys);
      'useValues' in options && (this._useStringValues = options.useValues);
      'useStringValues' in options && (this._useStringValues = options.useStringValues);
      'fieldPrefix' in options && (this._fieldPrefix = options.fieldPrefix);
    }
    !this._packKeys && (this._streamKeys = true);

    this._useStringValues && (this._transform = this._valueTransform);
    this._keys = [];
    this._buffer = '';
    this._index = 0;
  }

  _transform(chunk, _, callback) {
    switch (chunk.name) {
      case 'endArray':
        this._transform = this._transformToObject;
        break;
      case 'stringChunk':
        this._buffer += chunk.value;
        break;
      case 'endString':
        this._keys.push(this._buffer);
        this._buffer = '';
        break;
    }
    callback(null);
  }

  _valueTransform(chunk, _, callback) {
    switch (chunk.name) {
      case 'endArray':
        this._transform = this._transformToObject;
        break;
      case 'stringValue':
        this._keys.push(chunk.value);
        break;
    }
    callback(null);
  }

  _transformToObject(chunk, encoding, callback) {
    switch (chunk.name) {
      case 'startArray':
        this.push({name: 'startObject'});
        break;
      case 'endArray':
        this.push({name: 'endObject'});
        this._index = 0;
        break;
      case 'startString':
      case 'stringValue':
        const key = this._index < this._keys.length ? this._keys[this._index] : (this._fieldPrefix + this._index);
        ++this._index;
        if (this._streamKeys) {
          this.push({name: 'startKey'});
          this.push({name: 'stringChunk', value: key});
          this.push({name: 'endKey'});
        }
        this._packKeys && this.push({name: 'keyValue', value: key});
        if (chunk.name === 'startString') {
          this._transform = this._passString;
          return this._transform(chunk, encoding, callback);
        }
        this.push(chunk);
        break;
    }
    callback(null);
  }

  _passString(chunk, _, callback) {
    if (this._expected) {
      const expected = this._expected;
      this._expected = '';
      this._transform = this._transformToObject;
      if (expected === chunk.name) {
        this.push(chunk);
      } else {
        return this._transform(chunk, _, callback);
      }
    } else {
      this.push(chunk);
      if (chunk.name === 'endString') {
        this._expected = 'stringValue';
      }
    }
    callback(null);
  }
}
AsObjects.asObjects = AsObjects.make;
AsObjects.make.Constructor = AsObjects;

module.exports = AsObjects;
