# MCP (Model Context Protocol) Setup Guide

This guide explains how to integrate the Basecamp-to-LLM MCP server with Codex and Cursor for seamless Basecamp task management within your IDE.

## What is MCP?

The Model Context Protocol (MCP) allows AI assistants like Codex and Cursor to interact with external tools and services. This package provides an MCP server that exposes Basecamp functionality directly to your IDE.

## Available MCP Tools

The Basecamp MCP server provides the following tools:

### 1. `list_projects`
Lists all available Basecamp projects in your account.

**Parameters:** None

**Example:**
```json
{
  "name": "list_projects",
  "arguments": {}
}
```

### 2. `fetch_todos`
Fetches todos from a Basecamp project and converts them to task formats.

**Parameters:**
- `projectName` (required): Name of the Basecamp project
- `tableName` (optional): Specific kanban board name
- `columnName` (optional): Specific column name to filter by
- `outputPath` (optional): Custom output path for tasks file

**Example:**
```json
{
  "name": "fetch_todos",
  "arguments": {
    "projectName": "My Project",
    "tableName": "Sprint Board",
    "columnName": "In Progress"
  }
}
```

### 3. `authenticate`
Authenticates with Basecamp using OAuth2.

**Parameters:**
- `openBrowser` (optional): Whether to open browser for OAuth (default: true)

**Example:**
```json
{
  "name": "authenticate",
  "arguments": {
    "openBrowser": true
  }
}
```

### 4. `get_project_info`
Gets detailed information about a specific project.

**Parameters:**
- `projectName` (required): Name of the Basecamp project

**Example:**
```json
{
  "name": "get_project_info",
  "arguments": {
    "projectName": "My Project"
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
# Test CLI functionality
npx @aexol-studio/basecamp-to-llm projects

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

For more help, please [open an issue](https://github.com/aexol-studio/basecamp-to-llm/issues) on GitHub.
