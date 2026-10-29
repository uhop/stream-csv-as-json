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

  // a sink that encodes each string alone needs every surrogate pair within one string
  let heldSurrogate = '';

  const takeHeld = () => {
    const held = heldSurrogate;
    heldSurrogate = '';
    return held;
  };

  return flushable(chunk => {
    if (chunk === none) return heldSurrogate ? takeHeld() : none;
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
        return heldSurrogate ? takeHeld() + '"' : '"';
      case 'stringChunk': {
        let value = chunk.value.replace(/"/g, '""');
        if (heldSurrogate) value = takeHeld() + value;
        const last = value.charCodeAt(value.length - 1);
        if (last >= 0xd800 && last <= 0xdbff) {
          heldSurrogate = value.charAt(value.length - 1);
          if (value.length === 1) return none;
          value = value.slice(0, -1);
        }
        return value;
      }
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
