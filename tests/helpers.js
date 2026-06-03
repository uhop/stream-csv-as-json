import {Readable, Writable} from 'node:stream';

export {readWebString, drain, writeAndCollect} from './web-helpers.js';

export const readString = (string, quant, options) =>
  new Readable({
    objectMode: true,
    ...options,
    read() {
      if (isNaN(quant)) {
        this.push(string, 'utf8');
      } else if (string instanceof Buffer) {
        for (let i = 0; i < string.length; i += quant) {
          this.push(string.subarray(i, i + quant));
        }
      } else {
        for (let i = 0; i < string.length; i += quant) {
          this.push(string.substring(i, i + quant), 'utf8');
        }
      }
      this.push(null);
    }
  });

export const streamToArray = array =>
  new Writable({
    objectMode: true,
    write(chunk, _, callback) {
      array.push(chunk);
      callback(null);
    }
  });

export default readString;
