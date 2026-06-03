// @ts-self-types="./parser.d.ts"

import {flushable, gen, many, none} from 'stream-chain/core';
import fixUtf8Stream from 'stream-chain/utils/fixUtf8Stream.js';

// charCodeAt-based CSV tokenizer. The value/value1 state classifies the field
// start with charCodeAt + integer compares and takes a whole-field fast path
// when the field (and the char that terminates it) is already in the buffer:
// one slice -> one set of tokens, no regex engine. Quoted fields with `""`
// escaping take a sibling whole-field scan. Anything that abuts the buffer
// tail, an empty field, a row terminator, or a multi-char separator falls back
// verbatim to the incremental sticky-regex machine below, preserving exact
// resumability and error behavior. Structural tokens are module-level
// singletons (the per-emission allocations were ~70% of token churn).

const ASCII_QUOTE = 0x22, // "
  ASCII_LF = 0x0a, // \n
  ASCII_CR = 0x0d; // \r

const defaultPatterns = {
  value: /(?:"|,|\n|\r|[\s\S])/y,
  regularValue: /(?:[^,\r\n]{1,256}|,|\n|\r)/y,
  quotedValue: /(?:[^"]{1,256}|")/y,
  quotedContinuation: /(?:"|,|\n|\r)/y
};

const buildPatterns = separator => {
  const sep = separator === ',' ? ',' : separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    sepOr = '|' + sep + '|',
    sepNot = '[^' + sep;
  const result = {};
  for (const key of Object.keys(defaultPatterns)) {
    result[key] = new RegExp(defaultPatterns[key].source.replace('|,|', sepOr).replace('[^,', sepNot), 'y');
  }
  return result;
};

const tokenStartArray = {name: 'startArray'},
  tokenEndArray = {name: 'endArray'},
  tokenStartString = {name: 'startString'},
  tokenEndString = {name: 'endString'};

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
  // The charCodeAt fast path requires a single-char separator; multi-char
  // separators (sepCode < 0) fall back to the regex machine unconditionally.
  const sepCode = separator.length === 1 ? separator.charCodeAt(0) : -1;
  const patterns = buildPatterns(separator);

  let done = false,
    expect = 'value1',
    expectLF = false,
    accumulator = '',
    buffer = '',
    firstChunk = true;

  return flushable(buf => {
    const tokens = [];

    if (buf === none) {
      done = true;
    } else {
      if (firstChunk) {
        firstChunk = false;
        if (buf.charCodeAt(0) === 0xfeff) buf = buf.slice(1);
      }
      buffer += buf;
    }

    let match,
      value,
      index = 0;

    main: while (index < buffer.length || done) {
      switch (expect) {
        case 'value1':
        case 'value': {
          // charCodeAt fast paths — only with a char present and a single-char separator.
          if (!done && sepCode >= 0 && index < buffer.length) {
            const cc = buffer.charCodeAt(index);
            if (cc !== ASCII_QUOTE && cc !== sepCode && cc !== ASCII_CR && cc !== ASCII_LF) {
              // unquoted field: scan to its terminator
              let j = index + 1;
              while (j < buffer.length) {
                const d = buffer.charCodeAt(j);
                if (d === sepCode || d === ASCII_CR || d === ASCII_LF) break;
                ++j;
              }
              if (j < buffer.length) {
                const field = buffer.slice(index, j);
                expect === 'value1' && tokens.push(tokenStartArray);
                if (streamStrings) tokens.push(tokenStartString, {name: 'stringChunk', value: field}, tokenEndString);
                packStrings && tokens.push({name: 'stringValue', value: field});
                const term = buffer.charCodeAt(j);
                if (term === sepCode) {
                  expect = 'value';
                  expectLF = false;
                } else {
                  tokens.push(tokenEndArray);
                  expect = 'value1';
                  expectLF = term === ASCII_CR;
                }
                index = j + 1;
                break;
              }
              // field abuts the buffer tail → fall back to the regex machine
            } else if (cc === ASCII_QUOTE) {
              // quoted field: scan for the closing quote, decoding "" escapes
              let k = index + 1,
                s = '',
                rs = k,
                after = -1,
                termCode = -1,
                okFast = false;
              for (;;) {
                if (k >= buffer.length) break;
                const e = buffer.charCodeAt(k);
                if (e === ASCII_QUOTE) {
                  if (k + 1 >= buffer.length) break; // need the next char to disambiguate close vs ""
                  if (buffer.charCodeAt(k + 1) === ASCII_QUOTE) {
                    s += buffer.slice(rs, k) + '"';
                    k += 2;
                    rs = k;
                    continue;
                  }
                  s += buffer.slice(rs, k);
                  termCode = buffer.charCodeAt(k + 1);
                  after = k + 2;
                  okFast = true;
                  break;
                }
                ++k;
              }
              if (okFast && (termCode === sepCode || termCode === ASCII_CR || termCode === ASCII_LF)) {
                expect === 'value1' && tokens.push(tokenStartArray);
                if (streamStrings) {
                  tokens.push(tokenStartString);
                  if (s) tokens.push({name: 'stringChunk', value: s});
                  tokens.push(tokenEndString);
                }
                packStrings && tokens.push({name: 'stringValue', value: s});
                if (termCode === sepCode) {
                  expect = 'value';
                  expectLF = false;
                } else {
                  tokens.push(tokenEndArray);
                  expect = 'value1';
                  expectLF = termCode === ASCII_CR;
                }
                index = after;
                break;
              }
              // abuts the tail, or an unexpected char follows the close → fall back
            }
          }

          // fallback: incremental sticky-regex machine
          patterns.value.lastIndex = index;
          match = patterns.value.exec(buffer);
          if (!match) break main;
          value = match[0];
          expect === 'value1' && !(value === '\n' && expectLF) && tokens.push(tokenStartArray);
          switch (value) {
            case '"':
              streamStrings && tokens.push(tokenStartString);
              expect = 'quotedValue';
              break;
            case '\n':
              if (expectLF) break;
            // intentional fall down
            case '\r':
              if (expect === 'value') {
                if (streamStrings) {
                  tokens.push(tokenStartString);
                  tokens.push(tokenEndString);
                }
                packStrings && tokens.push({name: 'stringValue', value: ''});
              }
              tokens.push(tokenEndArray);
              expect = 'value1';
              break;
            case separator:
              if (streamStrings) {
                tokens.push(tokenStartString);
                tokens.push(tokenEndString);
              }
              packStrings && tokens.push({name: 'stringValue', value: ''});
              expect = 'value';
              break;
            default:
              if (streamStrings) {
                tokens.push(tokenStartString);
                tokens.push({name: 'stringChunk', value});
              }
              packStrings && (accumulator = value);
              expect = 'regularValue';
              break;
          }
          expectLF = value === '\r';
          index += value.length;
          break;
        }
        case 'regularValue':
          patterns.regularValue.lastIndex = index;
          match = patterns.regularValue.exec(buffer);
          if (!match) break main;
          value = match[0];
          switch (value) {
            case separator:
              streamStrings && tokens.push(tokenEndString);
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
              streamStrings && tokens.push(tokenEndString);
              if (packStrings) {
                tokens.push({name: 'stringValue', value: accumulator});
                accumulator = '';
              }
              tokens.push(tokenEndArray);
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
          if (!match) {
            if (index < buffer.length) {
              throw new Error('Parser cannot parse input: unexpected character after a quoted value');
            }
            break main;
          }
          value = match[0];
          if (value === '"') {
            streamStrings && tokens.push({name: 'stringChunk', value: '"'});
            packStrings && (accumulator += '"');
            expect = 'quotedValue';
          } else {
            streamStrings && tokens.push(tokenEndString);
            if (packStrings) {
              tokens.push({name: 'stringValue', value: accumulator});
              accumulator = '';
            }
            if (value === separator) {
              expect = 'value';
            } else {
              tokens.push(tokenEndArray);
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
            tokens.push(tokenStartString);
            tokens.push(tokenEndString);
          }
          packStrings && tokens.push({name: 'stringValue', value: ''});
          tokens.push(tokenEndArray);
          break;
        default:
          streamStrings && tokens.push(tokenEndString);
          packStrings && tokens.push({name: 'stringValue', value: accumulator});
          tokens.push(tokenEndArray);
          break;
      }
    }

    buffer = buffer.slice(index);
    return tokens.length ? many(tokens) : none;
  });
};

const parser = options => gen(fixUtf8Stream(), csvParser(options));

export default parser;
export {parser};
