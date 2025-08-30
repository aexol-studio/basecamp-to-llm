# Repository Guidelines

## Project Structure & Module Organization
- `src/`: TypeScript sources (`cli.ts`, `index.ts`, `basecamp-fetcher.ts`, `basecamp-types.ts`, `mcp-server.ts`). Tests live in `src/__tests__/`.
- `dist/`: Compiled JS/typings; CLI binaries map to `dist/cli.js` and `dist/mcp-server.js`.
- `examples/`: Runnable usage samples (`basic-usage.ts|js`, `mcp-usage.ts`).
- `configs/`: IDE MCP configs (`codex.toml` for Codex, `cursor.json` for Cursor).
- `scripts/`: Utilities like `setup-mcp.js`.

## Build, Test, and Development Commands
- `npm run build`: Compile TypeScript to `dist` (tsc).
- `npm run dev`: Watch-mode TypeScript build.
- `npm test` / `npm run test:watch`: Run Jest tests.
- `npm run lint` / `lint:fix`: ESLint checks and autofix.
- `npm run format` / `format:check`: Prettier format and verify.
- `npm run clean`: Remove `dist/`.
- Examples: `npm run example`, `example:js`, `example:mcp`.

## Coding Style & Naming Conventions
- Language: TypeScript (Node 18+). Indent 2 spaces; single quotes; width 100; trailing commas `es5`; LF endings (see `.prettierrc`).
- Linting: ESLint with `@typescript-eslint` + Prettier integration. Key rules: no unused vars (prefix ignored `_`), prefer `const`, no `var`.
- Filenames: kebab-case for modules; tests end with `.test.ts` or `.spec.ts` in `__tests__/`.

## Testing Guidelines
- Framework: Jest via `ts-jest` (`jest.config.js`).
- Test discovery: `src/**/__tests__/**/*.ts` and `src/**/*.(spec|test).ts`.
- Coverage: collected from `src/**/*.ts`; reports in `coverage/` (text, lcov, html).
- Write focused unit tests for new behavior and regressions; keep I/O and network mocked.

## Commit & Pull Request Guidelines
- Commits: Conventional Commits (e.g., `feat:`, `fix:`, `docs:`, `test:`, `chore:`). Example: `feat: add MCP server start command`.
- PRs: clear description, linked issues, test coverage for changes, screenshots/logs when CLI behavior changes, passing CI, updated docs/examples if applicable.

## Security & Configuration Tips
- Required env vars for Basecamp: `BASECAMP_CLIENT_ID`, `BASECAMP_CLIENT_SECRET`, `BASECAMP_REDIRECT_URI`, `BASECAMP_USER_AGENT` (do not commit secrets).
- MCP setup: `npx @aexol-studio/basecamp-to-llm setup-mcp` or copy `configs/*` into `.codex/` or `.cursor/`.
