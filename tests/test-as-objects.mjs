import test from 'tape-six';
import chain from 'stream-chain';

import parser from '../src/parser.js';
import asObjects from '../src/as-objects.js';
import Assembler from 'stream-json/assembler.js';

import readString from './read-string.mjs';

test.asPromise('as-objects: simple', (t, resolve, reject) => {
  const input = 'alpha,beta,gamma\r\n1,,"",""""\r\n2,three,"four",five\r\n',
    expected = [
      {alpha: '1', beta: '', gamma: '', field3: '"'},
      {alpha: '2', beta: 'three', gamma: 'four', field3: 'five'}
    ],
    result = [];

  const pipeline = chain([readString(input), parser(), asObjects()]);
  const asm = new Assembler();

  pipeline.on('data', token => {
    asm[token.name] && asm[token.name](token.value);
    if (asm.done) result.push(asm.current);
  });
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('as-objects: with useValues parser option', (t, resolve, reject) => {
  const input = 'alpha,beta,gamma\r\n1,,"",""""\r\n2,three,"four",five\r\n',
    expected = [
      {alpha: '1', beta: '', gamma: '', field3: '"'},
      {alpha: '2', beta: 'three', gamma: 'four', field3: 'five'}
    ],
    result = [];

  const pipeline = chain([readString(input), parser({useValues: true}), asObjects()]);
  const asm = new Assembler();

  pipeline.on('data', token => {
    asm[token.name] && asm[token.name](token.value);
    if (asm.done) result.push(asm.current);
  });
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('as-objects: custom fieldPrefix', (t, resolve, reject) => {
  const input = 'alpha,,gamma\r\n1,,"",""""\r\n2,three,"four",five\r\n',
    expected = [
      {alpha: '1', column1: '', gamma: '', column3: '"'},
      {alpha: '2', column1: 'three', gamma: 'four', column3: 'five'}
    ],
    result = [];

  const pipeline = chain([readString(input), parser({useValues: true}), asObjects({fieldPrefix: 'column'})]);
  const asm = new Assembler();

  pipeline.on('data', token => {
    asm[token.name] && asm[token.name](token.value);
    if (asm.done) result.push(asm.current);
  });
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('as-objects: useStringValues header', (t, resolve, reject) => {
  const input = 'alpha,beta,gamma\r\n1,two,3\r\n',
    expected = [{alpha: '1', beta: 'two', gamma: '3'}],
    result = [];

  const pipeline = chain([readString(input), parser(), asObjects({useStringValues: true})]);
  const asm = new Assembler();

  pipeline.on('data', token => {
    asm[token.name] && asm[token.name](token.value);
    if (asm.done) result.push(asm.current);
  });
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});

test.asPromise('as-objects: withParser pipeline', (t, resolve, reject) => {
  const input = 'a,b\r\n1,2\r\n',
    expected = [{a: '1', b: '2'}],
    result = [];

  const pipeline = chain([readString(input), asObjects.withParser()]);
  const asm = new Assembler();

  pipeline.on('data', token => {
    asm[token.name] && asm[token.name](token.value);
    if (asm.done) result.push(asm.current);
  });
  pipeline.on('error', reject);
  pipeline.on('end', () => {
    t.deepEqual(result, expected);
    resolve();
  });
});
