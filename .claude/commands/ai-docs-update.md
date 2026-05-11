---
description: Update AI-facing docs (llms.txt, llms-full.txt, ARCHITECTURE.md, AGENTS.md) after API or structural changes
---

# AI Documentation Update

Refresh all AI-facing files after changes to the public API, modules, or
project structure.

## Steps

1. Read the public-API `.d.ts` files under `src/` — `index`, `parser`,
   `as-objects`, `stringer`, `utils/with-parser` — to identify the current
   surface (exports, options, types).
2. Read `AGENTS.md` and `ARCHITECTURE.md` for current state.
3. Identify what changed (new modules, options, renamed exports, new
   utilities, deprecations, error behavior, etc.).
4. Update `llms.txt`:
   - Ensure the API section matches the `.d.ts` files.
   - Update common patterns if new features were added.
   - Keep it concise — this is for quick LLM consumption.
5. Update `llms-full.txt`:
   - Full API reference with all components, options, and examples.
   - Include any new exports, options, or behavioral notes (e.g., parser
     row-terminator leniency, BOM stripping, thrown errors).
6. Update `wiki/Home.md` if the overview or structure changed; refresh the
   per-component wiki pages (`parser.md`, `as‐objects.md`, `stringer.md`,
   `utils‐with‐parser.md`, `Main-module.md`) when their slice of the API
   moved.
7. Update `ARCHITECTURE.md` if project structure, module dependencies, or
   layout changed.
8. Update `AGENTS.md` if critical rules, commands, or architecture quick
   reference changed.
9. If `AGENTS.md` changed, run `/sync-ai-rules` to propagate to
   `.windsurfrules` / `.cursorrules` / `.clinerules`.
10. Provide a summary of what was updated.
