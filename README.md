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
- 🎨 **Enriched card context with comments and visual attachments (images)**
- 🖼️ **Extract and analyze images from card comments for AI vision models**

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
   # For Codex (TOML)
   cp node_modules/@aexol-studio/basecamp-to-llm/configs/codex.toml .codex/config.toml

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
- **🎯 Task Management (Recommended):**
  - `sdk_card_tables_create_task` - Create a complete task (card with description and steps) in one operation
  - `sdk_card_tables_get_enriched` - Get card with comments, creator info, and visual attachments (images)
- **Steps (Card Table Subtasks):**
  - `sdk_steps_create` - Create a step within a card
  - `sdk_steps_update` - Update an existing step
  - `sdk_steps_complete` - Mark a step as completed/uncompleted
  - `sdk_steps_reposition` - Change step position within card

#### Usage in IDE

Once configured, you can use natural language in your IDE:

```
"Can you list my Basecamp projects?"
"Create a task for implementing user authentication with 3 steps"
"Add a new task to the Sprint board with description and subtasks"
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
import { BasecampClient, StepsResource, CardTablesResource } from '@aexol-studio/basecamp-to-llm';

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

// 🎯 RECOMMENDED: Create a complete task with description and steps
const client = new BasecampClient();
const cardTables = new CardTablesResource(client);

const task = await cardTables.createCardWithSteps(projectId, columnId, {
  title: 'Implement user authentication',
  content: `Complete user authentication system with OAuth2 support.
  
Requirements:
- Support email/password login
- Add OAuth2 providers (Google, GitHub)
- Implement JWT tokens
- Add password reset flow`,
  due_on: '2025-12-31',
  steps: [
    { title: 'Design authentication flow', due_on: '2025-12-10' },
    { title: 'Implement OAuth2 integration', due_on: '2025-12-15' },
    { title: 'Add JWT token handling', due_on: '2025-12-20' },
    { title: 'Create password reset flow', due_on: '2025-12-25' },
    { title: 'Write tests and documentation', due_on: '2025-12-30' },
  ],
});

console.log(`Created task: ${task.card.title} with ${task.steps.length} steps`);

// 🎨 Get enriched card with comments and visual context
const enriched = await cardTables.getEnrichedCard(projectId, cardId);

console.log(`Card: ${enriched.card.title}`);
console.log(`Comments: ${enriched.comments.length}`);
console.log(`Images: ${enriched.images.length}`);

// Access image URLs for vision AI analysis
enriched.images.forEach(img => {
  console.log(`- ${img.metadata.filename} by ${img.creator}`);
  console.log(`  Preview: ${img.url}`);
  if (img.metadata.dimensions) {
    console.log(`  Size: ${img.metadata.dimensions.width}x${img.metadata.dimensions.height}px`);
  }
});

// Work with Steps individually (if needed)
const steps = new StepsResource(client);

// Create a new step in a card
const newStep = await steps.create(projectId, cardId, {
  title: 'Review code',
  due_on: '2025-12-31',
  assignees: '123,456', // comma-separated person IDs
});

// Update a step
await steps.update(projectId, stepId, {
  title: 'Review and approve code',
  due_on: '2026-01-15',
});

// Mark step as completed
await steps.complete(projectId, stepId, 'on');

// Mark step as uncompleted
await steps.complete(projectId, stepId, 'off');

// Reposition a step
await steps.reposition(projectId, cardId, {
  source_id: stepId,
  position: 2, // zero-indexed position
});
```

### Enriched Card Context with Visual Attachments

The library can fetch cards with full comment history and extract visual attachments (images) for AI vision analysis:

```typescript
import { BasecampClient } from '@aexol-studio/basecamp-to-llm';
import { getEnrichedCard, formatEnrichedCardAsText } from '@aexol-studio/basecamp-to-llm';

const client = new BasecampClient();
const projectId = 12345;
const cardId = 67890;

// Get enriched card with comments and images
const enriched = await getEnrichedCard(client, projectId, cardId);

console.log(`Card: ${enriched.card.title}`);
console.log(`Project: ${enriched.card.project.name}`);
console.log(`Steps: ${enriched.card.steps.length}`);
console.log(`Comments: ${enriched.comments.length}`);
console.log(`Images: ${enriched.images.length}`);

// Access all images with metadata
enriched.images.forEach((img, idx) => {
  console.log(`\nImage ${idx + 1}:`);
  console.log(`  Filename: ${img.metadata.filename}`);
  console.log(`  Creator: ${img.creator}`);
  console.log(`  Size: ${(img.metadata.size / 1024).toFixed(1)}KB`);
  if (img.metadata.dimensions) {
    console.log(
      `  Dimensions: ${img.metadata.dimensions.width}x${img.metadata.dimensions.height}px`
    );
  }
  console.log(`  Preview URL: ${img.url}`);
});

// Format as readable text for LLM context
const textContext = formatEnrichedCardAsText(enriched);
console.log('\n--- Formatted Text Context ---');
console.log(textContext);

// Use with vision AI models (e.g., GPT-4 Vision, Claude Vision)
// The image URLs can be passed directly to vision models for analysis
```

**Example Output:**

```
Card: Multi-Company Accounting - Wsparcie wielu firm
Project: KSIĘGOWOŚĆ
Steps: 15
Comments: 1
Images: 1

Image 1:
  Filename: screenshot.png
  Creator: Aleksander Bondar
  Size: 24.3KB
  Dimensions: 534x295px
  Preview URL: https://preview.3.basecamp.com/5657330/blobs/.../previews/full
```

The enriched context includes:

- **Card details**: title, description, status, creator, project, column
- **All steps/subtasks**: with completion status, assignees, and due dates
- **All comments**: with creator info, timestamps, and content
- **Visual attachments**: extracted images with URLs, metadata, and creator info
- **Formatted text output**: ready for LLM consumption

This makes it perfect for:

- Providing full context to AI assistants
- Analyzing screenshots and diagrams in comments
- Understanding task requirements from visual mockups
- Generating summaries with visual context

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

### 1.2.0

- **🎯 NEW: `create_task` tool** - Create complete tasks (card with description and steps) in one operation
- `createCardWithSteps()` helper method for easy task creation with subtasks
- Description now recommended for all cards
- Improved AI integration for task management
- Better support for creating structured tasks with multiple steps
- Added support for Card Table Steps (subtasks)
- New StepsResource for creating, updating, completing, and repositioning steps
- MCP tools for steps management
- Comprehensive TypeScript types for steps

### 1.0.0

- Initial release
- OAuth2 authentication
- Fetch todos from Basecamp projects
- Export to JSON and Markdown formats
- CLI interface with Commander.js
