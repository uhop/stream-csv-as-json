---
description: Update AI-facing documentation files after API or architecture changes
---

# AI Documentation Update

Update all AI-facing files after changes to the public API, modules, or project structure.

## Steps

1. Read `src/index.js`, `src/parser.js`, `src/as-objects.js`, `src/stringer.js`, `src/utils/with-parser.js` to identify the current public API.
2. Read `AGENTS.md` and `ARCHITECTURE.md` for current state.
3. Identify what changed (new components, renamed exports, new options, removed features, etc.).
4. Update `llms.txt`:
   - Ensure the API section matches the current source.
   - Update common patterns if new features were added.
   - Keep it concise — this is for quick LLM consumption.
5. Update `llms-full.txt`:
   - Full API reference with all components, options, and examples.
6. Update `ARCHITECTURE.md` if project structure or module dependencies changed.
7. Update `AGENTS.md` if critical rules, commands, or architecture quick reference changed.
8. Sync `.windsurfrules`, `.cursorrules`, `.clinerules` if `AGENTS.md` changed:
   - These three files should be identical copies of the condensed rules.
9. Update wiki pages if the public API changed:
   - `wiki/Home.md` is the main hub — update the overview, component table, and examples.
   - Module pages use the source file name in lowercase: `parser.js` → `parser.md`, `as-objects.js` → `as-objects.md`.
   - Subdirectory modules prefix folder names with hyphens: `utils/with-parser.js` → `utils-with-parser.md`.
   - Default/index modules that aren't imported by name get a descriptive name: `index.js` → `Main-module.md`.
   - Non-module docs (guides, overviews) keep original casing: `Home.md`, `Performance.md`.
   - Standalone functions/objects use their name with parens: e.g., `fn().md`.
   - Always document all relevant module exports (factory, `.asStream()`, `.withParser()`, self-references, etc.).
   - Goals: brevity, clarity, simplicity. At least one import + usage example per page.
10. Track progress with the todo list and provide a summary when done.
