# @aexol-studio/basecamp-to-llm

Basecamp MCP server and CLI for AI-assisted project management. Connect your IDE (Codex, Cursor, OpenCode) to Basecamp via the Model Context Protocol.

## Features

- **MCP Server** — 13 tools for managing Basecamp projects, cards, steps, comments, and attachments directly from your IDE
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
```

### 3. Install

```bash
npm install @aexol-studio/basecamp-to-llm
```

### 4. Authenticate

```bash
npx @aexol-studio/basecamp-to-llm auth --open
```

## MCP Server Setup

Install as a dev dependency in your project:

```bash
npm install --save-dev @aexol-studio/basecamp-to-llm
```

Then configure your IDE:

<details>
<summary><strong>Codex</strong></summary>

Create `.codex/config.toml`:

```toml
[mcpServers.basecamp]
command = "npx"
args = ["-y", "@aexol-studio/basecamp-to-llm", "mcp"]

  [mcpServers.basecamp.env]
  BASECAMP_CLIENT_ID = "${env:BASECAMP_CLIENT_ID}"
  BASECAMP_CLIENT_SECRET = "${env:BASECAMP_CLIENT_SECRET}"
  BASECAMP_REDIRECT_URI = "${env:BASECAMP_REDIRECT_URI}"
  BASECAMP_USER_AGENT = "${env:BASECAMP_USER_AGENT}"
```

</details>

<details>
<summary><strong>Cursor</strong></summary>

Create `.cursor/config.json`:

```json
{
  "mcpServers": {
    "basecamp": {
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

Add to `opencode.jsonc` under `mcpServers`:

```jsonc
{
  "basecamp": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@aexol-studio/basecamp-to-llm", "mcp"],
    "environment": {
      "BASECAMP_CLIENT_ID": "your_client_id",
      "BASECAMP_CLIENT_SECRET": "your_client_secret",
      "BASECAMP_REDIRECT_URI": "http://localhost:8787/callback",
      "BASECAMP_USER_AGENT": "Your App Name (your@email.com)",
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

Set the 4 environment variables (`BASECAMP_CLIENT_ID`, `BASECAMP_CLIENT_SECRET`, `BASECAMP_REDIRECT_URI`, `BASECAMP_USER_AGENT`) in your client's MCP config.

</details>

### Available MCP Tools

**Authentication & API**

| Tool           | Description                                               |
| -------------- | --------------------------------------------------------- |
| `authenticate` | Start OAuth flow (optional `openBrowser`)                 |
| `api_request`  | Generic API request (method, path, query, body, absolute) |

**Projects**

| Tool                | Description                                        |
| ------------------- | -------------------------------------------------- |
| `sdk_projects_list` | List projects (optional status filter, pagination) |

**Card Tables (Kanban)**

| Tool                           | Description                                              |
| ------------------------------ | -------------------------------------------------------- |
| `sdk_card_tables_get`          | Get card table with columns and cards                    |
| `sdk_card_tables_get_card`     | Get a single card with basic info                        |
| `sdk_card_tables_get_enriched` | Get enriched card with comments, attachments, and images |
| `sdk_card_tables_create_task`  | Create a card with description and checklist steps       |
| `sdk_card_tables_update_card`  | Update card title, content, due date, or assignees       |
| `sdk_card_tables_move_card`    | Move a card to a different column                        |

**People & Comments**

| Tool                  | Description                    |
| --------------------- | ------------------------------ |
| `sdk_people_list`     | List all people in the account |
| `sdk_comments_create` | Add a comment to a recording   |

**Steps & Attachments**

| Tool                       | Description                                              |
| -------------------------- | -------------------------------------------------------- |
| `sdk_steps_complete`       | Mark a step as completed or uncompleted                  |
| `sdk_attachments_download` | Download attachment as base64 (supports quality options) |

## CLI Usage

```bash
# Authenticate with Basecamp (opens browser)
basecamp-to-llm auth --open

# List available projects
basecamp-to-llm projects

# Start the MCP server
basecamp-to-llm mcp

# Call any Basecamp API endpoint
basecamp-to-llm api GET /projects.json
basecamp-to-llm api POST /buckets/123/todolists.json -d '{"title":"My List"}'

# List available SDK actions
basecamp-to-llm sdk list

# Run an SDK action
basecamp-to-llm sdk run projects.list
basecamp-to-llm sdk run cardTables.get -a '{"projectId":123,"cardTableId":456}'
```

## Programmatic Usage

```typescript
import { BasecampClient, SDK } from '@aexol-studio/basecamp-to-llm';

const client = new BasecampClient();

// List projects
const projects = new SDK.ProjectsResource(client);
const list = await projects.list();

// Create a task with steps
const cards = new SDK.CardTablesResource(client);
const task = await cards.createCardWithSteps(projectId, columnId, {
  title: 'Implement auth',
  content: '<p>OAuth2 support</p>',
  steps: [{ title: 'Design auth flow' }, { title: 'Implement OAuth2' }, { title: 'Write tests' }],
});

// Get enriched card with comments and images
import { getEnrichedCard, formatEnrichedCardAsText } from '@aexol-studio/basecamp-to-llm';

const enriched = await getEnrichedCard(client, projectId, cardId);
const textContext = formatEnrichedCardAsText(enriched);
```

## Development

### Prerequisites

- Node.js 18+
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
npm run format         # Prettier format
npm run format:check   # Prettier check
npm run clean          # Remove dist/
```

### Project Structure

```
src/
├── cli.ts                # CLI entry point
├── index.ts              # Public exports
├── auth.ts               # OAuth2 authentication
├── basecamp-fetcher.ts   # HTTP fetching layer
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
