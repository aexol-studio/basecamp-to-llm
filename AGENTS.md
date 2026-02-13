# Repository Guidelines

CLI tool + MCP server that fetches Basecamp data and exposes it in LLM-friendly formats.
Published as `@aexol-studio/basecamp-to-llm` on npm.

## Project Structure

```
src/
  cli.ts              # Commander-based CLI entry (bin: basecamp-to-llm)
  mcp-server.ts       # MCP stdio server entry (bin: basecamp-mcp)
  index.ts            # Public API barrel exports
  auth.ts             # OAuth2 flow, token caching, refresh logic
  basecamp-fetcher.ts # Legacy high-level fetcher (uses auth internally)
  basecamp-types.ts   # Basecamp API response interfaces
  sdk/
    client.ts         # Low-level HTTP client (BasecampClient)
    types.ts          # Core SDK resource types (Project, Todo, Card, Step, etc.)
    registry.ts       # Action definitions wired to MCP tools (Zod schemas)
    resources/        # Resource classes: projects, cardTables, comments, steps, etc.
  __tests__/          # Jest unit tests
dist/                 # Compiled output (git-ignored)
```

## Build, Lint, Test Commands

```bash
npm run build          # tsc → dist/
npm run dev            # tsc --watch
npm run clean          # rimraf dist/
npm run lint           # eslint src
npm run lint:fix       # eslint src --fix
npm run format         # prettier --write "src/**/*.ts"
npm run format:check   # prettier --check "src/**/*.ts"
npm test               # jest (all tests)
npm run test:watch     # jest --watch
```

### Running a Single Test

```bash
npx jest src/__tests__/client.test.ts              # by file path
npx jest --testNamePattern="URL conversion"         # by test name regex
npx jest src/__tests__/client.test.ts -t "storage"  # file + name filter
```

### Pre-submit Checklist

```bash
npm run lint && npm run format:check && npm test && npm run build
```

## Code Style

### Formatting (Prettier — `.prettierrc`)

- 2-space indent, no tabs
- Single quotes, semicolons
- Print width 100, trailing commas `es5`
- Arrow parens: `avoid` (`x => x`, not `(x) => x`)
- LF line endings

### Linting (ESLint — `eslint.config.mjs`)

- `@typescript-eslint/recommended` + Prettier integration
- `prefer-const` (error), `no-var` (error)
- `@typescript-eslint/no-unused-vars` — error; prefix unused params with `_`
- `@typescript-eslint/no-explicit-any` — warn (use sparingly, add `eslint-disable` comment)
- `@typescript-eslint/no-non-null-assertion` — warn
- Explicit return types not required (`explicit-function-return-type: off`)

### TypeScript (`tsconfig.json`)

- Target/lib: ES2022, module: ESNext, moduleResolution: bundler
- `strict: true` plus additional strictness flags:
  - `noImplicitAny`, `noImplicitReturns`, `noImplicitThis`
  - `noUnusedLocals`, `noUnusedParameters`
  - `exactOptionalPropertyTypes` — `undefined` must be explicit in optional props
  - `noUncheckedIndexedAccess` — indexed access returns `T | undefined`
  - `noPropertyAccessFromIndexSignature` — use bracket notation for index sigs
- Declarations + source maps emitted

### Import Conventions

- Use `node:` prefix for Node built-ins: `import fs from 'node:fs/promises'`
- Relative imports use `.js` extension (ESM): `import { Foo } from './foo.js'`
- Type-only imports use `import type`: `import type { Project } from './types.js'`
- Barrel re-exports in `src/index.ts` and `src/sdk/index.ts`

### Naming Conventions

- Files: `kebab-case.ts` (e.g., `basecamp-fetcher.ts`, `enrichedCards.ts`)
- Tests: `<module>.test.ts` in `src/__tests__/`
- Classes: `PascalCase` (e.g., `BasecampClient`, `CardTablesResource`)
- Interfaces/types: `PascalCase` (e.g., `TokenCache`, `ActionDef`)
- Methods/functions: `camelCase`
- Constants: `camelCase` for module-level (e.g., `const actions: ActionDef[]`)
- Env vars accessed via bracket notation: `process.env['BASECAMP_USER_AGENT']`

### Error Handling Patterns

- Throw `new Error(...)` with descriptive messages including context:
  ```ts
  throw new Error(`HTTP ${res.status} for ${url}: ${text}`);
  ```
- Catch blocks in CLI/MCP use `error instanceof Error ? error.message : String(error)`
- MCP tool handlers return error text in content blocks instead of throwing:
  ```ts
  catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
  }
  ```
- Empty catch blocks for best-effort operations use `catch {}` (no binding)
- CLI exits with `process.exit(1)` on fatal errors after logging

### Class Patterns

- Resource classes take `BasecampClient` via constructor injection:
  ```ts
  export class ProjectsResource {
    constructor(private readonly client: BasecampClient) {}
  }
  ```
- Private fields use `private readonly` where possible
- Environment validation happens in constructors

### SDK / MCP Registration

- Actions defined in `src/sdk/registry.ts` as `ActionDef[]`
- Each action has both a JSON `schema` (backward compat) and `zodSchema` (for MCP)
- MCP server wraps actions with safe tool names (`sdk_` prefix)
- `registerTool` wrapper in `mcp-server.ts` uses `any` cast to avoid TS2589 deep inference

## Testing Guidelines

- Framework: Jest via `ts-jest`
- Test files: `src/__tests__/*.test.ts`
- Mock all I/O and network calls; do not make real Basecamp API requests
- Use `process.env` manipulation in `beforeEach`/`afterEach` for env-dependent tests
- `moduleNameMapper` rewrites `.js` → extensionless for ts-jest compatibility

## Commits & PRs

- Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`
- PRs require: clear description, passing CI, test coverage, updated docs/examples if applicable

## Security

- Never commit secrets. Required env vars:
  `BASECAMP_CLIENT_ID`, `BASECAMP_CLIENT_SECRET`, `BASECAMP_REDIRECT_URI`, `BASECAMP_USER_AGENT`
- Token cache stored in `.basecamp/basecamp-token.json` (git-ignored)
- MCP mode routes logs to stderr (`BASECAMP_MCP_STDERR=1`) to avoid corrupting stdio protocol
