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

const HIGH_SURROGATE_FIRST = 0xd800,
  HIGH_SURROGATE_LAST = 0xdbff;

const defaultPatterns = {
  value: /(?:"|,|\n|\r|[\s\S])/y,
  regularValue: /(?:[^,\r\n]{1,256}|,|\n|\r)/y,
  quotedValue: /(?:[^"]{1,256}|")/y,
  quotedContinuation: /(?:"|,|\n|\r)/y
};

// a longer separator: an unquoted field may hold its characters, only not the whole separator
const multiCharRegularValue = /(?:(?:(?!,)[^\r\n]){1,256}|,|\n|\r)/y;

const buildPatterns = separator => {
  const sep = separator === ',' ? ',' : separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    sepOr = '|' + sep + '|',
    sepNot = '[^' + sep;
  const result = {};
  for (const key of Object.keys(defaultPatterns)) {
    result[key] = new RegExp(defaultPatterns[key].source.replace('|,|', sepOr).replace('[^,', sepNot), 'y');
  }
  if (separator.length > 1) {
    result.regularValue = new RegExp(multiCharRegularValue.source.replace('(?!,)', '(?!' + sep + ')').replace('|,|', sepOr), 'y');
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
    heldSurrogate = '',
    buffer = '';

  // a multi-character separator split between chunks: its start at the buffer tail waits for the rest
  const separatorPending = index => sepCode < 0 && !done && buffer.length - index < separator.length && separator.startsWith(buffer.slice(index));

  // the length of the longest tail of a field's text at the buffer tail that may start a multi-character separator
  const separatorStartLength = value => {
    for (let k = Math.min(value.length, separator.length - 1); k > 0; --k) {
      if (separator.startsWith(value.slice(value.length - k))) return k;
    }
    return 0;
  };

  // a sink that encodes each chunk alone needs every surrogate pair within one chunk
  const pushStringChunk = (tokens, value) => {
    if (heldSurrogate) {
      value = heldSurrogate + value;
      heldSurrogate = '';
    }
    const last = value.charCodeAt(value.length - 1);
    if (last >= HIGH_SURROGATE_FIRST && last <= HIGH_SURROGATE_LAST) {
      heldSurrogate = value.charAt(value.length - 1);
      if (value.length === 1) return;
      value = value.slice(0, -1);
    }
    tokens.push({name: 'stringChunk', value});
  };

  const pushEndString = tokens => {
    if (heldSurrogate) {
      tokens.push({name: 'stringChunk', value: heldSurrogate});
      heldSurrogate = '';
    }
    tokens.push(tokenEndString);
  };

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
          if (separatorPending(index)) break main;
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
                pushStringChunk(tokens, value);
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
          if (sepCode < 0 && !done && index + value.length === buffer.length && value !== separator) {
            value = value.slice(0, value.length - separatorStartLength(value));
            if (!value) break main;
          }
          switch (value) {
            case separator:
              streamStrings && pushEndString(tokens);
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
              streamStrings && pushEndString(tokens);
              if (packStrings) {
                tokens.push({name: 'stringValue', value: accumulator});
                accumulator = '';
              }
              tokens.push(tokenEndArray);
              expect = 'value1';
              break;
            default:
              streamStrings && pushStringChunk(tokens, value);
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
            streamStrings && pushStringChunk(tokens, value);
            packStrings && (accumulator += value);
          }
          index += value.length;
          break;
        case 'quotedContinuation':
          patterns.quotedContinuation.lastIndex = index;
          match = patterns.quotedContinuation.exec(buffer);
          if (!match) {
            if (index < buffer.length && !separatorPending(index)) {
              throw new Error('Parser cannot parse input: unexpected character after a quoted value');
            }
            break main;
          }
          value = match[0];
          if (value === '"') {
            streamStrings && pushStringChunk(tokens, '"');
            packStrings && (accumulator += '"');
            expect = 'quotedValue';
          } else {
            streamStrings && pushEndString(tokens);
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
          streamStrings && pushEndString(tokens);
          packStrings && tokens.push({name: 'stringValue', value: accumulator});
          tokens.push(tokenEndArray);
          break;
      }
    }

    buffer = buffer.slice(index);
    return tokens.length ? many(tokens) : none;
  });
};

const parser = options => gen(fixUtf8Stream(options), csvParser(options));

export default parser;
export {parser, csvParser};
