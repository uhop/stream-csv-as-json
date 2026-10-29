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
    // a row of one empty field is quoted: a blank line parses as a row of no fields
    let loneEmpty = false;
    return flushable(chunk => {
      if (chunk === none) return none;
      switch (chunk.name) {
        case 'startArray':
          skipSeparator = true;
          loneEmpty = false;
          return none;
        case 'endArray':
          if (loneEmpty) {
            loneEmpty = false;
            return '""' + rowTerminator;
          }
          return rowTerminator;
        case 'stringValue': {
          const value = chunk.value;
          let result;
          if (skipSeparator) {
            skipSeparator = false;
            loneEmpty = !value;
            result = '';
          } else {
            loneEmpty = false;
            result = separator;
          }
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
  let heldSurrogate = '',
    inKey = false;

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
        if (inKey) return none;
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
      case 'startKey':
        inKey = true;
        return none;
      case 'endKey':
        inKey = false;
        return none;
      case 'stringValue':
      case 'startObject':
      case 'endObject':
      case 'keyValue':
        return none;
    }
    return none;
  });
};

export default stringer;
export {stringer};
