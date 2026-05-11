---
description: Pre-release verification checklist for stream-csv-as-json
---

# Release Check

Run through this checklist before publishing a new version.

## Steps

1. Check that `ARCHITECTURE.md` reflects any structural changes.
2. Check that `AGENTS.md` is up to date with any rule or workflow changes.
3. Check that `.windsurfrules`, `.clinerules`, `.cursorrules` are in sync with
   `AGENTS.md` (run `/sync-ai-rules` if not).
4. Check that `llms.txt` and `llms-full.txt` are up to date with any API changes
   (run `/ai-docs-update` if not).
5. Check that each `.js` / `.d.ts` pair under `src/` is in sync — `index`,
   `parser`, `as-objects`, `stringer`, `utils/with-parser`. All exports, all
   options, all types. The `// @ts-self-types` header at the top of each `.js`
   must point at the sibling `.d.ts`.
6. Check that `wiki/Home.md` links to all relevant wiki pages, including any
   new ones added this cycle.
7. Verify `package.json`:
   - `files` array includes `src`, `LICENSE`, `README.md`, `AGENTS.md`,
     `ARCHITECTURE.md`, `llms.txt`, `llms-full.txt` — and excludes
     authoring-tool-local files (`CLAUDE.md`, `.cursorrules`, `.windsurfrules`,
     `.clinerules`, `.claude/`, `.windsurf/`, `.github/`).
   - `exports` map is correct.
   - `description` and `keywords` are current.
8. Check that the copyright year in `LICENSE` includes the current year.
9. **Sweep dependencies for staleness.** Run `npm outdated` and bump the
   `package.json` ranges for anything reported (including in-range patches —
   `versioning-strategy: 'increase-if-necessary'` in Dependabot won't bring
   those in). For a library this is non-negotiable — stale ranges generate
   user complaints when consumers run a different version of the same dep.
10. Run `npm install` (or `npm install --package-lock-only`) to regenerate
    `package-lock.json` after any bumps from step 9. Re-run `npm run lint`
    afterwards — toolchain patches occasionally introduce new style rules.
11. Bump `version` in `package.json` (semver based on the nature of changes
    since the last tag — `git log <last-tag>..HEAD`).
12. Update release history in **both** locations:
    - `README.md` — cliff-notes: the 1–2–3 most memorable items, comma-separated.
      No internal changes, no devDep bumps. One footer line at the bottom of
      the section pointing at the wiki Release-notes page.
    - `wiki/Release-notes.md` — canonical long-form: a paragraph per release
      with bold feature names. Per-release date in the heading (use
      `git for-each-ref --sort=-creatordate
--format='%(refname:short) %(creatordate:short)' refs/tags`). The wiki
      is a git submodule — its own commit + parent-pointer bump.
13. Run the test suite:
    - `npm test` (Node)
    - Cross-runtime spot-checks via `npm run test:bun` / `test:deno` when a
      runtime concern is in play (not required every release).
14. Run TypeScript check: `npm run ts-check`.
15. Run JavaScript check: `npm run js-check`.
16. Run TypeScript tests: `npm run ts-test`.
17. Run lint: `npm run lint`.
18. Dry-run publish to verify package contents: `npm pack --dry-run`. Confirm
    `AGENTS.md` and `ARCHITECTURE.md` are present in the tarball and that
    none of the authoring-tool-local files (`CLAUDE.md`, `.cursorrules`,
    `.windsurfrules`, `.clinerules`) leaked in.
19. Stop and report — do **not** commit, tag, or publish without explicit
    confirmation from the user.
