# `@sanity/resource-bindings`

> [!IMPORTANT]
> This package is currently in beta and may change.

Browser helpers and type definitions for referencing Sanity resources defined in a Blueprint.

## Installation

```sh
npm install @sanity/resource-bindings
```

## Usage

```ts
import { defineConfig } from 'sanity'
import { createResourceRef } from '@sanity/resource-bindings'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemaTypes'

const resourceRef = createResourceRef()

export default defineConfig({
  name: 'example',
  title: 'Example Studio',

  projectId: resourceRef.project('my-project'),
  dataset: resourceRef.dataset('my-dataset'),

  plugins: [structureTool(), visionTool()],

  schema: {
    types: schemaTypes,
  },
})
```

## Development

ESM-only, browser-targeted package. Node.js >= 22.18 is required for local development (native TypeScript
type stripping in the test runner).

```sh
npm install
npm run build       # Clean dist/ and compile with tsc
npm run typecheck   # Type check src + test without emitting
npm run test        # Unit tests
npm run coverage    # Unit tests with coverage report
npm run lint        # Biome check
npm run lint:write  # Biome auto-fix
```

Run a single test file or test name:

```sh
node --test test/resources/index.test.ts
node --test --test-name-pattern="some test name" "test/**/*.test.ts"
```

### Project structure

```
src/
  index.ts    # Barrel exports (all public API)
  resources/  # Resource binding lookups
test/         # Unit tests, mirroring src/ structure
```

### Conventions

- Relative imports use the `.ts` extension so Node can run the sources directly; `tsc` rewrites them
  to `.js` on emit via `rewriteRelativeImportExtensions`.
- Formatting and linting is handled by Biome: 2-space indent, single quotes, no semicolons, trailing
  commas, no bracket spacing, 140 char line width.
- `src/` is typed against the DOM lib only (no Node types), so browser incompatibilities fail the
  typecheck. Node types are available in `test/` only.

## License

[MIT](./LICENSE)
