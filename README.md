# @aexol-studio/basecamp-to-llm

Basecamp MCP server and CLI for AI-assisted project management. Connect your IDE (Codex, Cursor, OpenCode) to Basecamp via the Model Context Protocol.
d
Requires Node.js 20 or newer. CI tests the Node.js 20 and 22 LTS lines; newer compatible Node.js releases are not intentionally excluded.

## Features

- **MCP Server** — 14 tools for managing Basecamp projects, cards, steps, comments, and attachments directly from your IDE
- **CLI** — Authenticate, list projects, call any Basecamp API endpoint, and run SDK actions from the terminal
- **Typed SDK** — Modular TypeScript SDK covering projects, card tables, people, comments, steps, messages, and todos
- **OAuth2 Authentication** — Secure token-based auth with automatic refresh
- **Enriched Cards** — Fetch cards with full comment history, visual attachments (images), and formatted text output for LLM context
- **Kanban Management** — Create tasks with checklists, move cards between columns, update assignees and due dates

## Quick Start

### 1. Create a Basecamp OAuth App

1. Go to [https://launchpad.37signals.com/integrations](https://launchpad.37signals.com/integrations)
2. Create a new integration
3. Set the redirect URI to `http://localhost:8787/callback`
4. Note your `client_id` and `client_secret`

### 2. Environment Variables

```bash
export BASECAMP_CLIENT_ID="your_client_id"
export BASECAMP_CLIENT_SECRET="your_client_secret"
export BASECAMP_REDIRECT_URI="http://localhost:8787/callback"
export BASECAMP_USER_AGENT="Your App Name (your@email.com)"
# Optional when your authorization includes multiple Basecamp accounts
export BASECAMP_ACCOUNT_ID="your_account_id"
```

These are shell exports: run them in the same shell (or shell startup file) that launches the CLI. The package does not load `.env` files automatically. MCP clients may instead set the variables in their server configuration.

### 3. Install

```bash
npm install @aexol-studio/basecamp-to-llm
```

### 4. Authenticate

```bash
npx @aexol-studio/basecamp-to-llm auth --open
```

### Token cache security

OAuth tokens are cached in `.basecamp/basecamp-token.json` under the current working
directory. Treat this file as sensitive and do not commit it. If your setup has an older
or root-level token cache such as `.basecamp-token`, ignore that too:

```gitignore
# Basecamp OAuth token cache
.basecamp/
.basecamp-token*
```

## MCP Server Setup

Install as a dev dependency in your project:

```bash
npm install --save-dev @aexol-studio/basecamp-to-llm
```

The package installs two binaries:

- `basecamp-to-llm` provides the CLI, including the `mcp` subcommand.
- `basecamp-mcp` starts the MCP stdio server directly.

Then configure your IDE:

<details>
<summary><strong>Codex</strong></summary>

Create `.codex/config.toml`:

```toml
[mcp_servers.basecamp]
command = "npx"
args = ["-y", "@aexol-studio/basecamp-to-llm", "mcp"]
env_vars = ["BASECAMP_CLIENT_ID", "BASECAMP_CLIENT_SECRET", "BASECAMP_REDIRECT_URI", "BASECAMP_USER_AGENT"]
```

</details>

<details>
<summary><strong>Cursor</strong></summary>

Create `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "basecamp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@aexol-studio/basecamp-to-llm", "mcp"],
      "env": {
        "BASECAMP_CLIENT_ID": "${env:BASECAMP_CLIENT_ID}",
        "BASECAMP_CLIENT_SECRET": "${env:BASECAMP_CLIENT_SECRET}",
        "BASECAMP_REDIRECT_URI": "${env:BASECAMP_REDIRECT_URI}",
        "BASECAMP_USER_AGENT": "${env:BASECAMP_USER_AGENT}"
      }
    }
  }
}
```

</details>

<details>
<summary><strong>OpenCode</strong></summary>

Add to `opencode.jsonc` under the top-level `mcp` key:

```jsonc
{
  "mcp": {
    "basecamp": {
      "type": "local",
      "command": ["npx", "-y", "@aexol-studio/basecamp-to-llm", "mcp"],
      "environment": {
        "BASECAMP_CLIENT_ID": "{env:BASECAMP_CLIENT_ID}",
        "BASECAMP_CLIENT_SECRET": "{env:BASECAMP_CLIENT_SECRET}",
        "BASECAMP_REDIRECT_URI": "{env:BASECAMP_REDIRECT_URI}",
        "BASECAMP_USER_AGENT": "{env:BASECAMP_USER_AGENT}",
      },
    },
  },
}
```

</details>

<details>
<summary><strong>Claude Code / Other MCP Clients</strong></summary>

Use stdio transport with the command:

```bash
npx -y @aexol-studio/basecamp-to-llm mcp
```

Set the four required environment variables (`BASECAMP_CLIENT_ID`, `BASECAMP_CLIENT_SECRET`, `BASECAMP_REDIRECT_URI`, `BASECAMP_USER_AGENT`) in your client's MCP config. `BASECAMP_ACCOUNT_ID` is optional.

</details>

The MCP server first connects over stdio, then tries a cached token or silent refresh. If neither is available, it opens a browser and waits for the configured local OAuth callback. In a headless environment, authenticate first with `basecamp-to-llm auth` (copy the printed URL into a browser) or provide a reusable token cache; a failed automatic browser flow is logged to stderr and does not terminate the MCP server. All MCP logs use stderr so stdout remains reserved for the protocol.

### Available MCP Tools

Required arguments are shown without `?`; optional arguments include `?`.

| Tool                           | Arguments                                                                                    | Description                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `authenticate`                 | `openBrowser?`                                                                               | Start or refresh OAuth authentication                            |
| `api_request`                  | `method`, `path`, `query?`, `body?`, `absolute?`                                             | Make a generic Basecamp API request                              |
| `sdk_projects_list`            | `status?`, `page?`                                                                           | List projects; `status` may be `archived` or `trashed`           |
| `sdk_card_tables_get`          | `projectId`, `tableId`                                                                       | Get a raw board and its column metadata; use `list_cards` for cards |
| `sdk_card_tables_list_cards`   | `projectId`, `columnId`, `detail?`, `page?`, `limit?`                                        | List a bounded page of compact or extended cards                 |
| `sdk_card_tables_get_card`     | `projectId`, `cardId`                                                                        | Get one raw card                                                 |
| `sdk_card_tables_get_enriched` | `projectId`, `cardId`, `format?`, `downloadImages?`, `imageQuality?`                         | Get card context with comments, creator data, and attachments    |
| `sdk_card_tables_create_task`  | `projectId`, `columnId`, `title`, `content`, `due_on?`, `assignee_ids?`, `notify?`, `steps?` | Create a card and optional checklist steps                       |
| `sdk_card_tables_update_card`  | `projectId`, `cardId`, `title?`, `content?`, `due_on?`, `assignee_ids?`                      | Update supported card fields                                     |
| `sdk_card_tables_move_card`    | `projectId`, `cardId`, `columnId`                                                            | Move a card to another column                                    |
| `sdk_people_list`              | None                                                                                         | List people in the account                                       |
| `sdk_comments_create`          | `projectId`, `recordingId`, `content`                                                        | Add an HTML comment to a recording                               |
| `sdk_steps_complete`           | `projectId`, `stepId`, `completion`                                                          | Set step completion to `on` or `off`                             |
| `sdk_attachments_download`     | `url`, `filename?`, `mimeType?`                                                              | Download and save an attachment; return image content or file metadata |

### Compact card listing and pagination

`sdk_card_tables_list_cards` defaults to `detail: "compact"`, `page: 1`, and
`limit: 25`. `page` is one-based and `limit` must be from 1 through 100. Compact
cards contain only:

- `id`, normalized `title` (`title`, then `name`, then an empty string)
- optional `status`, `position`, `due_on`, `app_url`, and `updated_at`
- projected `assignees` with `id` and `name` only
- normalized `comments_count`
- `steps` counts with `completed` and `total`

Compact cards do not include card descriptions, content, or comment bodies. Use
`detail: "extended"` when the full raw Basecamp `Card` objects are required for
the requested window. Listing cards never fetches comment bodies; use
`sdk_card_tables_get_enriched` when comment context is explicitly needed.

Compact request arguments:

```json
{
  "projectId": 123,
  "columnId": 456,
  "page": 1,
  "limit": 25
}
```

Extended request arguments:

```json
{
  "projectId": 123,
  "columnId": 456,
  "detail": "extended",
  "page": 2,
  "limit": 10
}
```

Both modes return the same envelope:

```json
{
  "detail": "compact",
  "cards": [],
  "pagination": {
    "page": 1,
    "limit": 25,
    "returned": 0,
    "has_more": false
  }
}
```

When `has_more` is true, `pagination.next_page` contains the next one-based page.
It is omitted otherwise. The response does not report a total because the
bounded traversal does not fetch the complete collection.

### Enriched card text and attachment downloads

`sdk_card_tables_get_enriched` with `format: "text"` preserves the card description as Basecamp HTML. Comment bodies are converted to plain text. This deliberate distinction keeps rich description markup and embedded attachment references available to the LLM.

`sdk_attachments_download` always writes the downloaded bytes to `.basecamp/images/` under the process's current working directory. If `filename` is omitted, it uses `attachment`; characters other than letters, numbers, `.`, `_`, and `-` become `_`. A download overwrites an existing file with the same sanitized name. Image MIME types are returned as MCP image content; non-images return saved-file metadata. The `imageQuality` option applies only to image downloads performed by `sdk_card_tables_get_enriched`.

## CLI Usage

```bash
# Authenticate with Basecamp (opens browser)
basecamp-to-llm auth --open

# List available projects
basecamp-to-llm projects

# Start the MCP server
basecamp-to-llm mcp

# Or start the installed MCP binary directly
basecamp-mcp

# Call any Basecamp API endpoint
basecamp-to-llm api GET /projects.json
basecamp-to-llm api POST /todosets/123/todolists.json -d '{"name":"My List"}'

# List available SDK actions
basecamp-to-llm sdk list

# Run an SDK action
basecamp-to-llm sdk run projects.list
basecamp-to-llm sdk run card_tables.get -a '{"projectId":123,"tableId":456}'
basecamp-to-llm sdk run card_tables.list_cards -a '{"projectId":123,"columnId":456,"page":1,"limit":25}'
```

## Programmatic Usage

```typescript
import { BasecampClient, SDK } from "@aexol-studio/basecamp-to-llm";

const client = new BasecampClient();

// List projects
const projects = new SDK.ProjectsResource(client);
const list = await projects.list();

// List a bounded compact page
const cards = new SDK.CardTablesResource(client);
const page = await cards.listCardsPage(projectId, columnId, {
  detail: "compact",
  page: 1,
  limit: 25,
});

// Create a task with steps
const task = await cards.createCardWithSteps(projectId, columnId, {
  title: "Implement auth",
  content: "<p>OAuth2 support</p>",
  steps: [
    { title: "Design auth flow" },
    { title: "Implement OAuth2" },
    { title: "Write tests" },
  ],
});
```

For `createCardWithSteps`, each nested step requires `title`; optional `due_on` uses `YYYY-MM-DD`, and optional `assignees` is a comma-separated string of Basecamp person IDs. The card-level field remains `assignee_ids: number[]`.

The enriched-card aggregation and text formatter are currently MCP-facing helpers rather than stable top-level programmatic exports. The existing public API (`BasecampFetcher`, `BasecampAuth`, `BasecampClient`, and the `SDK` resource namespace) remains available; use `SDK.CardTablesResource` for the stable typed card API.

## Development

### Prerequisites

- Node.js 20 or newer (CI tests the Node.js 20 and 22 LTS lines)
- npm

### Setup

```bash
git clone https://github.com/aexol-studio/basecamp-to-llm.git
cd basecamp-to-llm
npm install
```

### Scripts

```bash
npm run build          # Compile TypeScript
npm run dev            # Watch mode
npm test               # Run tests
npm run test:watch     # Watch tests
npm run lint           # ESLint check
npm run lint:fix       # ESLint autofix
npm run format         # Format TypeScript with Prettier
npm run format:check   # Check TypeScript formatting
npm run clean          # Remove dist/
```

### Project Structure

```
src/
├── cli.ts                # CLI entry point
├── index.ts              # Public exports
├── auth.ts               # OAuth2 authentication
├── basecamp-fetcher.ts   # Legacy high-level fetcher
├── basecamp-types.ts     # TypeScript type definitions
├── mcp-server.ts         # MCP server implementation
└── sdk/
    ├── index.ts           # SDK exports
    ├── client.ts          # BasecampClient
    ├── registry.ts        # Tool registry for MCP
    ├── types.ts           # SDK type definitions
    └── resources/
        ├── cardTables.ts  # Kanban boards and cards
        ├── comments.ts    # Comments
        ├── enrichedCards.ts # Enriched card context
        ├── messages.ts    # Messages
        ├── people.ts      # People
        ├── projects.ts    # Projects
        ├── steps.ts       # Card checklist steps
        └── todos.ts       # Todos
```

## License

MIT — see [LICENSE](LICENSE) for details.

Contributions welcome — [open an issue](https://github.com/aexol-studio/basecamp-to-llm/issues) or submit a PR.
