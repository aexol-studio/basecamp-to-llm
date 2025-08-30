# @aexol-studio/basecamp-to-llm

A CLI tool to fetch Basecamp todos and convert them to LLM-friendly task formats like Codex tasks.

## Features

- 🔐 OAuth2 authentication with Basecamp
- 📋 Fetch todos from Basecamp projects
- 🎯 Filter by specific kanban boards and columns
- 📝 Export to JSON and Markdown formats
- 🚀 Easy-to-use CLI interface
- 🔄 Automatic token refresh
- 🤖 **MCP (Model Context Protocol) server for Codex/Cursor integration**

## Installation

```bash
npm install -g @aexol-studio/basecamp-to-llm
```

Or use it directly with npx:

```bash
npx @aexol-studio/basecamp-to-llm --help
```

## Setup

### 1. Create a Basecamp OAuth2 App

1. Go to [Basecamp Admin](https://launchpad.37signals.com/integrations)
2. Create a new integration
3. Set the redirect URI to `http://localhost:8787/callback` (or your preferred local URL)
4. Note down your `client_id` and `client_secret`

### 2. Set Environment Variables

Create a `.env` file or set these environment variables:

```bash
export BASECAMP_CLIENT_ID="your_client_id"
export BASECAMP_CLIENT_SECRET="your_client_secret"
export BASECAMP_REDIRECT_URI="http://localhost:8787/callback"
export BASECAMP_USER_AGENT="Your App Name (your@email.com)"
```

**Required:**
- `BASECAMP_CLIENT_ID`: Your OAuth2 client ID from Basecamp
- `BASECAMP_CLIENT_SECRET`: Your OAuth2 client secret from Basecamp
- `BASECAMP_REDIRECT_URI`: Must match your app config (e.g., `http://localhost:8787/callback`)
- `BASECAMP_USER_AGENT`: Required by Basecamp API (e.g., `"My App (you@example.com)"`)

**Optional:**
- `BASECAMP_ACCOUNT_ID`: Force a specific account ID (otherwise auto-detected)

## Usage

### CLI Usage

#### Authentication

First, authenticate with Basecamp:

```bash
basecamp-to-llm auth --open
```

This will open your browser for OAuth authorization and cache the token locally.

#### List Available Projects

```bash
basecamp-to-llm projects
```

#### Fetch Todos from a Project

```bash
# Basic usage
basecamp-to-llm fetch "My Project Name"

# With specific kanban board
basecamp-to-llm fetch "My Project Name" --table "Sprint Board"

# With specific column
basecamp-to-llm fetch "My Project Name" --column "In Progress"

# Custom output path
basecamp-to-llm fetch "My Project Name" --out ./my-tasks.json

# Open browser for re-authentication if needed
basecamp-to-llm fetch "My Project Name" --open
```

### MCP (Model Context Protocol) Integration

This package includes an MCP server that allows you to use Basecamp functionality directly within Codex and Cursor.

#### Quick Setup

1. **Install as dev dependency:**
   ```bash
   npm install --save-dev @aexol-studio/basecamp-to-llm
   ```

2. **Run setup script:**
   ```bash
   npx @aexol-studio/basecamp-to-llm setup-mcp
   ```
   
   Or manually copy configuration:
   ```bash
   # For Codex
   cp node_modules/@aexol-studio/basecamp-to-llm/configs/codex.json .codex/config.json
   
   # For Cursor
   cp node_modules/@aexol-studio/basecamp-to-llm/configs/cursor.json .cursor/config.json
   ```

3. **Set environment variables** (see Setup section above)

4. **Restart your IDE**

#### Available MCP Tools

- `list_projects` - List all Basecamp projects
- `fetch_todos` - Fetch todos from a project
- `authenticate` - Authenticate with Basecamp
- `get_project_info` - Get project details

#### Usage in IDE

Once configured, you can use natural language in your IDE:

```
"Can you list my Basecamp projects?"
"Fetch todos from my Sprint Project"
"I need to authenticate with Basecamp"
```

For detailed MCP setup instructions, see [MCP_SETUP.md](MCP_SETUP.md).

### Output Files

The tool creates two files in the `.codex/` directory (or your specified output path):

1. **`tasks.json`** - JSON format for Codex CLI
2. **`tasks.md`** - Human-readable Markdown format

Example `tasks.json`:
```json
{
  "plan": [
    {
      "step": "Implement user authentication",
      "status": "pending"
    },
    {
      "step": "Add payment processing",
      "status": "pending"
    }
  ]
}
```

Example `tasks.md`:
```markdown
# Codex Tasks from Basecamp: My Project

- [ ] Implement user authentication
- [ ] Add payment processing
```

## Programmatic Usage

You can also use the library programmatically:

```typescript
import { BasecampFetcher } from '@aexol-studio/basecamp-to-llm';

const fetcher = new BasecampFetcher();

// List projects
const projects = await fetcher.listProjects();
console.log('Available projects:', projects);

// Fetch todos
await fetcher.fetchTodos('My Project Name', {
  tableName: 'Sprint Board',
  columnName: 'In Progress',
  outputPath: './custom-output.json',
  openBrowser: false,
});
```

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/aexol-studio/basecamp-to-llm.git
cd basecamp-to-llm

# Install dependencies
npm install

# Set up environment variables (see Setup section above)
```

### Available Scripts

```bash
# Build the project
npm run build

# Development mode with watch
npm run dev

# Lint code
npm run lint
npm run lint:fix

# Format code
npm run format
npm run format:check

# Run tests
npm test
npm run test:watch

# Clean build artifacts
npm run clean
```

### Project Structure

```
src/
├── cli.ts              # CLI entry point
├── index.ts            # Main exports
├── basecamp-fetcher.ts # Core functionality
└── basecamp-types.ts   # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/aexol-studio/basecamp-to-llm/issues) on GitHub.

## Changelog

### 1.0.0
- Initial release
- OAuth2 authentication
- Fetch todos from Basecamp projects
- Export to JSON and Markdown formats
- CLI interface with Commander.js
