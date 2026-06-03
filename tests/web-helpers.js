// Pure + Web-Streams test helpers. Importing this file must not pull `node:*`
// — these helpers are reused by browser tests via `tape-six-puppeteer`.

// Wrap a string (or pre-chunked array) as a Web `ReadableStream`. Mirror of
// `readString` from `tests/helpers.js`: the same `quant` chunking semantics so
// Node and Web tests can drive parsers with byte-identical chunk boundaries.
//
// Usage: `chain([readWebString(input), parser(), stringer()])` is the Web
// equivalent of `chain([readString(input), parser(), stringer()])` on Node.
export const readWebString = (input, quant) => {
  const chunks = Array.isArray(input)
    ? input
    : !isNaN(quant) && input.length > quant
      ? Array.from({length: Math.ceil(input.length / quant)}, (_, i) => input.slice(i * quant, (i + 1) * quant))
      : [input];
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(chunks[i++]);
      else controller.close();
    }
  });
};

// Drain any async-iterable token / chunk source to an array. Substrate-agnostic:
// works on a Node `Duplex` (iterable via `[Symbol.asyncIterator]` since Node 10)
// AND on a `stream-chain/web` chain output (which exposes `.readable` —
// the helper detects which shape it received).
export const drain = async source => {
  const readable = source[Symbol.asyncIterator] ? source : source.readable;
  const out = [];
  for await (const chunk of readable) out.push(chunk);
  return out;
};

// Feed values into a TransformStream's writable, close it, drain the readable,
// return the collected output. Mirrors the Node-side `stream.write(...); stream.end()`
// + `stream.on('data', …)` pattern in a substrate-agnostic shape.
export const writeAndCollect = async (transform, values) => {
  const writer = transform.writable.getWriter();
  const reader = transform.readable.getReader();
  const out = [];
  const readP = (async () => {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      out.push(value);
    }
  })();
  const writeP = (async () => {
    for (const v of values) await writer.write(v);
    await writer.close();
  })();
  await Promise.all([writeP, readP]);
  return out;
};
