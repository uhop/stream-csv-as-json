// @ts-self-types="./as-objects.d.ts"

'use strict';

const {asStream: makeStream, flushable, many, none} = require('stream-chain');
const withParser = require('./utils/with-parser.js');

const asObjects = options => {
  let fieldPrefix = 'field';
  let useStringValues = false;
  let packKeys = true,
    streamKeys = true;

  if (options) {
    'packValues' in options && (packKeys = options.packValues);
    'packKeys' in options && (packKeys = options.packKeys);
    'streamValues' in options && (streamKeys = options.streamValues);
    'streamKeys' in options && (streamKeys = options.streamKeys);
    'useValues' in options && (useStringValues = options.useValues);
    'useStringValues' in options && (useStringValues = options.useStringValues);
    'fieldPrefix' in options && (fieldPrefix = options.fieldPrefix);
  }
  !packKeys && (streamKeys = true);

  const keys = [];
  let headerDone = false;
  let headerBuffer = '';
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

  const headerCollector = useStringValues
    ? chunk => {
        switch (chunk.name) {
          case 'endArray':
            headerDone = true;
            break;
          case 'stringValue':
            keys.push(chunk.value);
            break;
        }
        return none;
      }
    : chunk => {
        switch (chunk.name) {
          case 'endArray':
            headerDone = true;
            break;
          case 'stringChunk':
            headerBuffer += chunk.value;
            break;
          case 'endString':
            keys.push(headerBuffer);
            headerBuffer = '';
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

asObjects.asStream = options => makeStream(asObjects(options), {...options, writableObjectMode: true, readableObjectMode: true});
asObjects.asObjects = asObjects;
asObjects.withParser = options => withParser(asObjects, options);
asObjects.withParserAsStream = options => withParser.asStream(asObjects, options);

module.exports = asObjects;
