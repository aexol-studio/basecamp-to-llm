# MCP (Model Context Protocol) Setup Guide

This guide explains how to integrate the Basecamp-to-LLM MCP server with Codex and Cursor for seamless Basecamp task management within your IDE.

## What is MCP?

The Model Context Protocol (MCP) allows AI assistants like Codex and Cursor to interact with external tools and services. This package provides an MCP server that exposes Basecamp functionality directly to your IDE.

## Available MCP Tools

The Basecamp MCP server provides a full-featured set of tools:

- `authenticate`: Start OAuth flow (optional `openBrowser`).
- `list_projects`: List all projects.
- `get_project_info`: Show project details by name.
- `fetch_todos`: Export todos from a project to `.codex/tasks.json` and `.codex/tasks.md`.
- `api_request`: Generic API request for any Basecamp endpoint.
- `sdk_list_actions`: List all typed SDK actions available as `sdk:*` tools.
- `sdk:*` tools: Typed, discoverable actions that map to the Basecamp API.

### Typed SDK Tools (sdk:*)
These tools are generated from our SDK registry and cover common Basecamp resources. Examples:

- Projects: `sdk:projects.list`, `sdk:projects.get`, `sdk:projects.create`, `sdk:projects.update`, `sdk:projects.trash`
- Todos: `sdk:todos.list`, `sdk:todos.get`, `sdk:todos.create`, `sdk:todos.update`, `sdk:todos.complete`, `sdk:todos.uncomplete`
- Card Tables: `sdk:card_tables.get`, `sdk:card_tables.get_column`, `sdk:card_tables.get_card`, `sdk:card_tables.create_card`
- Messages: `sdk:messages.list`, `sdk:messages.get`, `sdk:messages.create`
- Comments: `sdk:comments.list_for_recording`, `sdk:comments.get`, `sdk:comments.create`, `sdk:comments.update`
- People: `sdk:people.list`, `sdk:people.get`

Use `sdk_list_actions` to get exact input schemas. Example invocation payload:
```json
{
  "name": "sdk:todos.create",
  "arguments": {
    "projectId": 2085958499,
    "listId": 1069479520,
    "content": "Ship SDK"
  }
}
```

## Setup Instructions

### Prerequisites

1. **Basecamp OAuth App Setup**
   - Go to [Basecamp Admin](https://launchpad.37signals.com/integrations)
   - Create a new integration
   - Set redirect URI to `http://localhost:8787/callback`
   - Note your `client_id` and `client_secret`

2. **Environment Variables**
   Set these environment variables in your system or IDE:
   ```bash
   export BASECAMP_CLIENT_ID="your_client_id"
   export BASECAMP_CLIENT_SECRET="your_client_secret"
   export BASECAMP_REDIRECT_URI="http://localhost:8787/callback"
   export BASECAMP_USER_AGENT="Your App Name (your@email.com)"
   ```

### Installation

Install the package as a dev dependency in your project:

```bash
npm install --save-dev @aexol-studio/basecamp-to-llm
```

### Codex Integration

1. **Copy Configuration**
   Copy the Codex configuration to your project:
   ```bash
   cp node_modules/@aexol-studio/basecamp-to-llm/configs/codex.json .codex/config.json
   ```

2. **Or Create Custom Config**
   Create `.codex/config.json` in your project root:
   ```json
   {
     "mcpServers": {
       "basecamp": {
         "command": "npx",
         "args": ["@aexol-studio/basecamp-to-llm", "mcp"],
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

3. **Restart Codex**
   Restart Codex to load the new MCP server configuration.

### Cursor Integration

1. **Copy Configuration**
   Copy the Cursor configuration to your project:
   ```bash
   cp node_modules/@aexol-studio/basecamp-to-llm/configs/cursor.json .cursor/config.json
   ```

2. **Or Create Custom Config**
   Create `.cursor/config.json` in your project root:
   ```json
   {
     "mcpServers": {
       "basecamp": {
         "command": "npx",
         "args": ["@aexol-studio/basecamp-to-llm", "mcp"],
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

3. **Restart Cursor**
   Restart Cursor to load the new MCP server configuration.

## Usage Examples

### In Codex/Cursor Chat

Once configured, you can use the Basecamp tools directly in your IDE:

**List Projects:**
```
Can you list my Basecamp projects?
```

**Fetch Todos:**
```
Can you fetch todos from my "Sprint Project" and create task files?
```

**Authenticate:**
```
I need to authenticate with Basecamp
```

### Programmatic Usage

You can also use the MCP server programmatically:

```typescript
import { BasecampMCPServer } from '@aexol-studio/basecamp-to-llm';

const server = new BasecampMCPServer();
await server.run();
```

## Troubleshooting

### Common Issues

1. **"Missing env BASECAMP_USER_AGENT"**
   - Ensure all environment variables are set
   - Check that your IDE has access to environment variables

2. **"Project not found"**
   - Verify the project name matches exactly
   - Use `list_projects` to see available projects

3. **Authentication Issues**
   - Ensure your OAuth app is properly configured
   - Check that redirect URI matches your app settings

4. **MCP Server Not Starting**
   - Verify the package is installed correctly
   - Check that Node.js version is 18+
   - Ensure all dependencies are installed

### Debug Mode

To run the MCP server in debug mode:

```bash
npx @aexol-studio/basecamp-to-llm mcp
```

This will start the server directly and show any error messages.

### Manual Testing

Test the MCP server manually:

```bash
# Test CLI functionality (typed)
npx @aexol-studio/basecamp-to-llm sdk list
npx @aexol-studio/basecamp-to-llm sdk run projects.list

# Test MCP server
npx @aexol-studio/basecamp-to-llm mcp
```

## Advanced Configuration

### Custom Environment Variables

You can override environment variables in the config:

```json
{
  "mcpServers": {
    "basecamp": {
      "command": "npx",
      "args": ["@aexol-studio/basecamp-to-llm", "mcp"],
      "env": {
        "BASECAMP_CLIENT_ID": "your_actual_client_id",
        "BASECAMP_CLIENT_SECRET": "your_actual_client_secret",
        "BASECAMP_REDIRECT_URI": "http://localhost:8787/callback",
        "BASECAMP_USER_AGENT": "My Custom App (me@example.com)"
      }
    }
  }
}
```

### Multiple Basecamp Accounts

To use multiple Basecamp accounts, create separate MCP server configurations:

```json
{
  "mcpServers": {
    "basecamp-personal": {
      "command": "npx",
      "args": ["@aexol-studio/basecamp-to-llm", "mcp"],
      "env": {
        "BASECAMP_CLIENT_ID": "personal_client_id",
        "BASECAMP_CLIENT_SECRET": "personal_client_secret",
        "BASECAMP_REDIRECT_URI": "http://localhost:8787/callback",
        "BASECAMP_USER_AGENT": "Personal App (me@example.com)"
      }
    },
    "basecamp-work": {
      "command": "npx",
      "args": ["@aexol-studio/basecamp-to-llm", "mcp"],
      "env": {
        "BASECAMP_CLIENT_ID": "work_client_id",
        "BASECAMP_CLIENT_SECRET": "work_client_secret",
        "BASECAMP_REDIRECT_URI": "http://localhost:8787/callback",
        "BASECAMP_USER_AGENT": "Work App (me@company.com)"
      }
    }
  }
}
```

## Support

If you encounter issues:

1. Check the [main README](../README.md) for general troubleshooting
2. Verify your Basecamp OAuth app configuration
3. Ensure all environment variables are set correctly
4. Test the CLI functionality first before using MCP
5. Check the debug output from the MCP server

**Typed SDK example:**
```
Create a to-do "Cut RC 1.0" in list 1069479520 of project 2085958499 using the Basecamp MCP tool sdk:todos.create.
```

**Generic API example:**
```
Call api_request with method=GET and path=/projects.json and show me the result.
```
For more help, please [open an issue](https://github.com/aexol-studio/basecamp-to-llm/issues) on GitHub.
