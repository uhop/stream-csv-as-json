// @ts-self-types="./parser.d.ts"

'use strict';

const {asStream, flushable, many, none} = require('stream-chain');
const fixUtf8Stream = require('stream-chain/utils/fixUtf8Stream.js');
const gen = require('stream-chain/gen.js');

const defaultPatterns = {
  value: /(?:"|,|\n|\r|[\s\S])/y,
  regularValue: /(?:[^,\r\n]{1,256}|,|\n|\r)/y,
  quotedValue: /(?:[^"]{1,256}|")/y,
  quotedContinuation: /(?:"|,|\n|\r)/y
};

const buildPatterns = separator => {
  if (separator === ',') return defaultPatterns;
  const sep = separator.replace(/[#-.]|[[-^]|[?|{}]/g, '\\$&'),
    sepOr = '|' + sep + '|',
    sepNot = '[^' + sep;
  const result = {};
  for (const key of Object.keys(defaultPatterns)) {
    result[key] = new RegExp(defaultPatterns[key].source.replace('|,|', sepOr).replace('[^,', sepNot), 'y');
  }
  return result;
};

const startArray = () => ({name: 'startArray'});
const endArray = () => ({name: 'endArray'});
const startString = () => ({name: 'startString'});
const endString = () => ({name: 'endString'});

const csvParser = options => {
  let packStrings = true,
    streamStrings = true;

  if (options) {
    'packValues' in options && (packStrings = options.packValues);
    'packStrings' in options && (packStrings = options.packStrings);
    'streamValues' in options && (streamStrings = options.streamValues);
    'streamStrings' in options && (streamStrings = options.streamStrings);
  }

  !packStrings && (streamStrings = true);

  const separator = (options && options.separator) || ',';
  const patterns = buildPatterns(separator);

  let done = false,
    expect = 'value1',
    expectLF = false,
    accumulator = '',
    buffer = '';

  return flushable(buf => {
    const tokens = [];

    if (buf === none) {
      done = true;
    } else {
      buffer += buf;
    }

    let match,
      value,
      index = 0;

    main: while (index < buffer.length || done) {
      switch (expect) {
        case 'value1':
        case 'value':
          patterns.value.lastIndex = index;
          match = patterns.value.exec(buffer);
          if (!match) break main;
          value = match[0];
          expect === 'value1' && !(value === '\n' && expectLF) && tokens.push(startArray());
          switch (value) {
            case '"':
              streamStrings && tokens.push(startString());
              expect = 'quotedValue';
              break;
            case '\n':
              if (expectLF) break;
            // intentional fall down
            case '\r':
              if (expect === 'value') {
                if (streamStrings) {
                  tokens.push(startString());
                  tokens.push(endString());
                }
                packStrings && tokens.push({name: 'stringValue', value: ''});
              }
              tokens.push(endArray());
              expect = 'value1';
              break;
            case separator:
              if (streamStrings) {
                tokens.push(startString());
                tokens.push(endString());
              }
              packStrings && tokens.push({name: 'stringValue', value: ''});
              expect = 'value';
              break;
            default:
              if (streamStrings) {
                tokens.push(startString());
                tokens.push({name: 'stringChunk', value});
              }
              packStrings && (accumulator = value);
              expect = 'regularValue';
              break;
          }
          expectLF = value === '\r';
          index += value.length;
          break;
        case 'regularValue':
          patterns.regularValue.lastIndex = index;
          match = patterns.regularValue.exec(buffer);
          if (!match) break main;
          value = match[0];
          switch (value) {
            case separator:
              streamStrings && tokens.push(endString());
              if (packStrings) {
                tokens.push({name: 'stringValue', value: accumulator});
                accumulator = '';
              }
              expect = 'value';
              break;
            case '\n':
              if (expectLF) break;
            // intentional fall down
            case '\r':
              streamStrings && tokens.push(endString());
              if (packStrings) {
                tokens.push({name: 'stringValue', value: accumulator});
                accumulator = '';
              }
              tokens.push(endArray());
              expect = 'value1';
              break;
            default:
              streamStrings && tokens.push({name: 'stringChunk', value});
              packStrings && (accumulator += value);
              break;
          }
          expectLF = value === '\r';
          index += value.length;
          break;
        case 'quotedValue':
          patterns.quotedValue.lastIndex = index;
          match = patterns.quotedValue.exec(buffer);
          if (!match) {
            if (done) throw new Error('Parser cannot parse input: expected a quoted value');
            break main;
          }
          value = match[0];
          if (value === '"') {
            expect = 'quotedContinuation';
          } else {
            streamStrings && tokens.push({name: 'stringChunk', value});
            packStrings && (accumulator += value);
          }
          index += value.length;
          break;
        case 'quotedContinuation':
          patterns.quotedContinuation.lastIndex = index;
          match = patterns.quotedContinuation.exec(buffer);
          if (!match) break main;
          value = match[0];
          if (value === '"') {
            streamStrings && tokens.push({name: 'stringChunk', value: '"'});
            packStrings && (accumulator += '"');
            expect = 'quotedValue';
          } else {
            streamStrings && tokens.push(endString());
            if (packStrings) {
              tokens.push({name: 'stringValue', value: accumulator});
              accumulator = '';
            }
            if (value === separator) {
              expect = 'value';
            } else {
              tokens.push(endArray());
              expect = 'value1';
            }
          }
          expectLF = value === '\r';
          index += value.length;
          break;
      }
      if (done) break;
    }

    if (done) {
      switch (expect) {
        case 'quotedValue':
          throw new Error('Parser cannot parse input: expected a quoted value');
        case 'value1':
          break;
        case 'value':
          if (streamStrings) {
            tokens.push(startString());
            tokens.push(endString());
          }
          packStrings && tokens.push({name: 'stringValue', value: ''});
          tokens.push(endArray());
          break;
        default:
          streamStrings && tokens.push(endString());
          packStrings && tokens.push({name: 'stringValue', value: accumulator});
          tokens.push(endArray());
          break;
      }
    }

    buffer = buffer.slice(index);
    return tokens.length ? many(tokens) : none;
  });
};

const parser = options => gen(fixUtf8Stream(), csvParser(options));

parser.asStream = options => asStream(parser(options), options);
parser.parser = parser;

module.exports = parser;
