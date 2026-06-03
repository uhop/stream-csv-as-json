// @ts-self-types="./stringer.d.ts"

import {flushable, none} from 'stream-chain/core';

const stringer = options => {
  let useStringValues = false;
  let separator = ',';
  let rowTerminator = '\r\n';
  let containsQuotables = /[,\r\n"]/;

  if (options) {
    'useValues' in options && (useStringValues = options.useValues);
    'useStringValues' in options && (useStringValues = options.useStringValues);
    separator = options.separator || ',';
    'rowTerminator' in options && (rowTerminator = options.rowTerminator);
    if (separator !== ',') {
      const sep = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      containsQuotables = new RegExp(containsQuotables.source.replace('[,', '[' + sep));
    }
  }

  let skipSeparator = false;

  if (useStringValues) {
    return flushable(chunk => {
      if (chunk === none) return none;
      switch (chunk.name) {
        case 'startArray':
          skipSeparator = true;
          return none;
        case 'endArray':
          return rowTerminator;
        case 'stringValue': {
          let result;
          if (skipSeparator) {
            skipSeparator = false;
            result = '';
          } else {
            result = separator;
          }
          const value = chunk.value;
          if (containsQuotables.test(value)) {
            return result + '"' + value.replace(/"/g, '""') + '"';
          }
          return result + value;
        }
        case 'startString':
        case 'endString':
        case 'stringChunk':
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
        return rowTerminator;
      case 'startString': {
        let prefix;
        if (skipSeparator) {
          skipSeparator = false;
          prefix = '';
        } else {
          prefix = separator;
        }
        return prefix + '"';
      }
      case 'endString':
        return '"';
      case 'stringChunk':
        return chunk.value.replace(/"/g, '""');
      case 'stringValue':
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

export default stringer;
export {stringer};
