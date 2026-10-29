# Contributing to stream-csv-as-json

Thank you for your interest in contributing!

## Discuss significant changes first

Every significant change starts as a conversation. Before you write code, open an [issue](https://github.com/uhop/stream-csv-as-json/issues) that describes the
problem and the change you propose, and wait for a maintainer to approve it explicitly. A pull request for a significant change that wasn't discussed and
approved first isn't merged, and may be closed without review.

A significant change is anything beyond a small fix: a new feature or option, a change to the public API or to documented behavior, a new dependency, a
refactor, or a change to the build, the tests, or CI. Small fixes can go straight to a pull request: a typo, a broken link, or a bug fix of a few lines with a
test that fails without it.

The discussion saves your time as much as ours: a change that doesn't fit the project is cheaper to turn down before it is written. Approval covers the plan you
described, and the pull request is still reviewed against it.

To report a security vulnerability, don't use a public issue: follow [SECURITY.md](./SECURITY.md).

### What a change has to fit

Read the README and the [wiki](https://github.com/uhop/stream-csv-as-json/wiki) first: they say what stream-csv-as-json is for and how it is meant to be used.

- **The project's purpose.** stream-csv-as-json is a set of streaming CSV components that speak the `stream-json` token protocol, on Node.js and Web Streams. A
  change that takes it outside that purpose, or that serves one application's special needs, belongs in a fork you maintain yourself. The license allows it, and
  for a special need it is the better path.
- **The cost of keeping it.** A merged change is maintained here from then on, by the maintainer: its author rarely comes back to fix what turns up later. Each
  feature also grows the API and the documentation every user has to learn. A change has to be worth that cost, and a feature can be declined for that reason
  alone.
- **Speed.** stream-csv-as-json is built for CSV files far larger than available memory, where the parser's throughput sets how long a job takes. A change to
  the parser, `asObjects`, or the stringer comes with benchmark results before and after (`npm run bench`), and doesn't slow the common case.
- **One concern per pull request.** A pull request that mixes several changes goes back to its author to be split.

## Getting started

This project uses a git submodule for the wiki. Clone recursively:

```bash
git clone --recursive https://github.com/uhop/stream-csv-as-json.git
cd stream-csv-as-json
npm install
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the module map and dependency graph.

## Development workflow

1. Make your changes.
2. Lint: `npm run lint:fix`
3. Test: `npm test`
4. Type-check `.d.ts`: `npm run ts-check`
5. JS lint (`src/**/*.js`): `npm run js-check`

Touching `src/core/` or `src/web/` also warrants `npm run test:browser`, which runs the `tests/web/` suite in real headless chromium — the only check that
actually proves nothing browser-facing imports `node:*`, since Node, Bun, and Deno all expose `node:` and a leak passes there silently. It is a development-only
script and is deliberately absent from CI.

The runner is a normal devDependency, but this repo's `.npmrc` sets `ignore-scripts=true`, so installing it never downloads a browser. Install Chrome once, by
hand:

```bash
npm run browser:install
```

## Code style

- ESM (`import`) throughout — source and tests (`"type": "module"`). No CommonJS, no transpilation.
- Formatted with Prettier — see `.prettierrc` for settings.
- Two runtime dependencies: `stream-chain` and `stream-json`. Do not add others.
- Keep `.js` and `.d.ts` files in sync for all modules under `src/`; types and documentation live in the `.d.ts` sidecar, never as JSDoc in the `.js`.
- Keep the three substrates aligned: the algorithm lives in `src/core/`, `src/` and `src/web/` stay thin adapter wrappers.

## License

This project is distributed under the [BSD-3-Clause license](./LICENSE). External contributions are accepted only under licenses compatible with BSD-3-Clause;
submissions under fundamentally incompatible licenses cannot be merged.

## AI agents

If you are an AI coding agent, see [AGENTS.md](./AGENTS.md) for detailed project conventions, commands, and architecture.
