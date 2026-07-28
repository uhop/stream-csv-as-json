# Contributing to stream-csv-as-json

Thank you for your interest in contributing!

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

Touching `src/core/` or `src/web/` also warrants `npm run test:browser`, which runs the `tests/web/` suite in real headless chromium — the only check that actually proves nothing browser-facing imports `node:*`, since Node, Bun, and Deno all expose `node:` and a leak passes there silently. It is a development-only script and is deliberately absent from CI.

The runner is a normal devDependency, but `package.json`'s `allowScripts` block disables its install scripts, so installing it never downloads a browser. Install Chrome once, by hand:

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

This project is distributed under the [BSD-3-Clause license](./LICENSE). External contributions are accepted only under licenses compatible with BSD-3-Clause; submissions under fundamentally incompatible licenses cannot be merged.

## AI agents

If you are an AI coding agent, see [AGENTS.md](./AGENTS.md) for detailed project conventions, commands, and architecture.
