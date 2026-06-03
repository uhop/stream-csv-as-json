// @ts-self-types="./as-objects.d.ts"

import {flushable, many, none} from 'stream-chain/core';

const asObjects = options => {
  let fieldPrefix = 'field';
  let packKeys = true,
    streamKeys = true;

  if (options) {
    'packValues' in options && (packKeys = options.packValues);
    'packKeys' in options && (packKeys = options.packKeys);
    'streamValues' in options && (streamKeys = options.streamValues);
    'streamKeys' in options && (streamKeys = options.streamKeys);
    'fieldPrefix' in options && (fieldPrefix = options.fieldPrefix);
  }
  !packKeys && (streamKeys = true);

  const keys = [];
  let headerDone = false;
  let headerBuffer = '';
  let headerStreaming = false;
  let fieldIndex = 0;
  let expected = '';
  let passThrough = false;

  const getKey = () => (fieldIndex < keys.length && keys[fieldIndex]) || fieldPrefix + fieldIndex;

  const emitKey = tokens => {
    const key = getKey();
    ++fieldIndex;
    if (streamKeys) {
      tokens.push({name: 'startKey'});
      tokens.push({name: 'stringChunk', value: key});
      tokens.push({name: 'endKey'});
    }
    packKeys && tokens.push({name: 'keyValue', value: key});
  };

  const headerCollector = chunk => {
    switch (chunk.name) {
      case 'endArray':
        headerDone = true;
        break;
      case 'startString':
        headerStreaming = true;
        headerBuffer = '';
        break;
      case 'stringChunk':
        headerStreaming && (headerBuffer += chunk.value);
        break;
      case 'endString':
        if (headerStreaming) {
          keys.push(headerBuffer);
          headerBuffer = '';
        }
        break;
      case 'stringValue':
        if (headerStreaming) {
          headerStreaming = false;
        } else {
          keys.push(chunk.value);
        }
        break;
    }
    return none;
  };

  return flushable(chunk => {
    if (chunk === none) return none;

    if (!headerDone) return headerCollector(chunk);

    if (passThrough) {
      if (expected) {
        passThrough = false;
        expected = '';
        if (chunk.name === 'stringValue') {
          return chunk;
        }
        // not the expected stringValue — fall through to process below
      } else {
        if (chunk.name === 'endString') {
          expected = 'stringValue';
        }
        return chunk;
      }
    }

    const tokens = [];

    switch (chunk.name) {
      case 'startArray':
        tokens.push({name: 'startObject'});
        break;
      case 'endArray':
        tokens.push({name: 'endObject'});
        fieldIndex = 0;
        break;
      case 'startString':
        emitKey(tokens);
        passThrough = true;
        expected = '';
        tokens.push(chunk);
        break;
      case 'stringValue':
        emitKey(tokens);
        tokens.push(chunk);
        break;
    }

    return tokens.length ? many(tokens) : none;
  });
};

export default asObjects;
export {asObjects};
