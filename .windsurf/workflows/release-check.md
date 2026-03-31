---
description: Pre-release verification checklist for stream-csv-as-json
---

# Release Check

Run through this checklist before publishing a new version.

## Steps

1. Check that `ARCHITECTURE.md` reflects any structural changes.
2. Check that `AGENTS.md` is up to date with any rule or workflow changes.
3. Check that `.windsurfrules`, `.clinerules`, `.cursorrules` are in sync with `AGENTS.md`.
4. Check wiki pages follow `dev-docs/wiki-conventions.md` (use the `wiki-conventions` skill):
   - `wiki/Home.md` links to all component wiki pages.
   - Each wiki page documents all relevant module exports.
5. Check that `llms.txt` and `llms-full.txt` are up to date with any API changes.
6. Verify `package.json`:
   - `files` array includes all necessary entries.
7. Check that the copyright year in `LICENSE` includes the current year.
8. Bump `version` in `package.json`.
9. Update release history in `README.md`.
10. Run `npm install` to regenerate `package-lock.json`.
    // turbo
11. Run the full test suite: `npm test`
    // turbo
12. Run TypeScript type checking: `npm run ts-check`
    // turbo
13. Run Prettier lint: `npm run lint`
    // turbo
14. Dry-run publish to verify package contents: `npm pack --dry-run`
