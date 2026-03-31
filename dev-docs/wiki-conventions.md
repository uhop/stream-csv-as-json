# Wiki conventions

## Idea

Users should find information quickly. If a module can be imported by name, its wiki page uses that same name.

Example: project `abc` has three modules — `src/index.js`, `src/parser.js`, `src/utils/helper.js`. Users import them as:

```js
import abc from 'abc';
import {parse} from 'abc/parser.js';
import {helper} from 'abc/utils/helper.js';
```

`package.json` enables this:

```json
{
  "main": "src/index.js",
  "exports": {
    ".": "./src/index.js",
    "./*": "./src/*"
  }
}
```

### Modules

Two `abc` modules are imported by name: `parser.js` and `utils/helper.js`. Their wiki pages match: `parser.md` and `utils-helper.md`.

The main module (`src/index.js`) is not imported by name, so its wiki page gets a descriptive name instead, e.g., `Main-module.md`.

Every module page documents all its exports. Compact components are documented in the module that exports them.

Summary:

- Named modules use the module name as-is.
- If the name contains dashes, use a Unicode hyphen (U+2010 `‐`) instead of a regular dash. See `~/Open/tape-six/wiki/` for examples.
- Unnamed modules (`index.js`) get a descriptive page name.
- Subdirectory modules join folder and file names with a dash: `abc/utils/helper.js` → `utils-helper.md`.
- Unnamed modules in folders use the folder name: `utils/index.js` → `utils.md`.

### Components

When a component is large or important enough for its own page, use its exported name: `ClassName.md`, `CONSTANT_NAME.md`, `functionName.md`. For functions, add trailing parens: `functionName().md`.

### Previous versions

A project may retain wiki docs for older versions. Rename old pages with a version prefix: `V1-` for version 1, `V2-` for version 2, etc. Update all internal and external references when renaming.

These conventions do not apply to prefixed legacy pages.

### Other pages

Technical pages (`Home.md`) and descriptive pages (`Migrating-from-v1-to-v2.md`, `Performance.md`, `Concepts.md`) use descriptive names visible in the wiki index.

## Actions

**Important**: if wiki pages do not follow these conventions, ask once whether to fix them — legacy pages may need to stay. Apply these rules automatically to new pages or when explicitly asked.

When renaming pages, update all references in other wiki pages and in `README.md`.

Write these rules in relevant global skills (e.g., `docs-review`). Consider a dedicated skill or workflow as well.
