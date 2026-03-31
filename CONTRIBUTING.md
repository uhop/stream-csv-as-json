# Contributing to stream-csv-as-json

Thank you for your interest in contributing!

## Getting started

This project uses a git submodule for the wiki. Clone recursively:

```bash
git clone --recursive git@github.com:uhop/stream-csv-as-json.git
cd stream-csv-as-json
npm install
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the module map and dependency graph.

## Development workflow

1. Make your changes.
2. Test: `npm test`
3. Type-check: `npm run ts-check`
4. Lint: `npm run lint`

## Code style

- CommonJS source in `src/` (`require()`/`module.exports`). Tests use ESM (`.mjs`), CJS (`.cjs`), and TS (`.mts`).
- Formatted with Prettier — see `.prettierrc` for settings.
- One runtime dependency: `stream-json`. Do not add others.

## AI agents

If you are an AI coding agent, see [AGENTS.md](./AGENTS.md) for detailed project conventions, commands, and architecture.
