// @ts-self-types="./stringer.d.ts"

'use strict';

const {asStream, flushable, none} = require('stream-chain');

const stringer = options => {
  let useStringValues = false;
  let separator = ',';
  let containsQuotables = /[,\r\n"]/;

  if (options) {
    'useValues' in options && (useStringValues = options.useValues);
    'useStringValues' in options && (useStringValues = options.useStringValues);
    separator = options.separator || ',';
    if (separator !== ',') {
      const sep = separator.replace(/[#-.]|[[-^]|[?|{}]/g, '\\$&');
      containsQuotables = new RegExp(containsQuotables.source.replace('[,', '[' + sep));
    }
  }

  let skipSeparator = false;
  let skip = false;

  if (useStringValues) {
    return flushable(chunk => {
      if (chunk === none) return none;
      switch (chunk.name) {
        case 'startArray':
          skipSeparator = true;
          return none;
        case 'endArray':
          return '\r\n';
        case 'stringValue':
          if (skip) return none;
          let result = '';
          if (skipSeparator) {
            skipSeparator = false;
          } else {
            result = separator;
          }
          const value = chunk.value;
          if (containsQuotables.test(value)) {
            return result + '"' + value.replace(/"/g, '""') + '"';
          }
          return result + value;
        case 'startString':
          skip = true;
          return none;
        case 'endString':
          skip = false;
          return none;
        case 'stringChunk':
          return none;
        case 'startObject':
        case 'endObject':
        case 'startKey':
        case 'endKey':
        case 'keyValue':
          return none;
      }
      return none;
    });
  }

  return flushable(chunk => {
    if (chunk === none) return none;
    switch (chunk.name) {
      case 'startArray':
        skipSeparator = true;
        return none;
      case 'endArray':
        return '\r\n';
      case 'startString':
        let prefix = '';
        if (skipSeparator) {
          skipSeparator = false;
        } else {
          prefix = separator;
        }
        return prefix + '"';
      case 'endString':
        return '"';
      case 'stringChunk':
        return chunk.value.replace(/"/g, '""');
      case 'stringValue':
        return none;
      case 'startObject':
      case 'endObject':
      case 'startKey':
      case 'endKey':
      case 'keyValue':
        return none;
    }
    return none;
  });
};

stringer.asStream = options => asStream(stringer(options), {...options, writableObjectMode: true, readableObjectMode: false});
stringer.stringer = stringer;

module.exports = stringer;
