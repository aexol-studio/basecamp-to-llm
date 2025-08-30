#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { BasecampFetcher } from './basecamp-fetcher.js';

export class BasecampMCPServer {
  private server: Server;
  private fetcher: BasecampFetcher;

  constructor() {
    this.server = new Server({
      name: 'basecamp-to-llm',
      version: '1.0.0',
    });

    this.fetcher = new BasecampFetcher();
    this.setupTools();
  }

  private setupTools(): void {
    // List projects tool
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'list_projects',
            description: 'List all available Basecamp projects',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            name: 'fetch_todos',
            description: 'Fetch todos from a Basecamp project and convert to tasks',
            inputSchema: {
              type: 'object',
              properties: {
                projectName: {
                  type: 'string',
                  description: 'Name of the Basecamp project',
                },
                tableName: {
                  type: 'string',
                  description: 'Optional: Specific kanban board name',
                },
                columnName: {
                  type: 'string',
                  description: 'Optional: Specific column name to filter by',
                },
                outputPath: {
                  type: 'string',
                  description: 'Optional: Custom output path for tasks file',
                },
              },
              required: ['projectName'],
            },
          },
          {
            name: 'authenticate',
            description: 'Authenticate with Basecamp (opens browser for OAuth)',
            inputSchema: {
              type: 'object',
              properties: {
                openBrowser: {
                  type: 'boolean',
                  description: 'Whether to open browser for OAuth',
                  default: true,
                },
              },
              required: [],
            },
          },
          {
            name: 'get_project_info',
            description: 'Get detailed information about a specific project',
            inputSchema: {
              type: 'object',
              properties: {
                projectName: {
                  type: 'string',
                  description: 'Name of the Basecamp project',
                },
              },
              required: ['projectName'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'list_projects':
            return await this.handleListProjects();

          case 'fetch_todos':
            return await this.handleFetchTodos(args as any);

          case 'authenticate':
            return await this.handleAuthenticate(args as any);

          case 'get_project_info':
            return await this.handleGetProjectInfo(args as any);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  private async handleListProjects() {
    const projects = await this.fetcher.listProjects();

    const projectList = projects
      .map(
        project =>
          `- **${project.name}** (ID: ${project.id})${project.archived ? ' [ARCHIVED]' : ''}`
      )
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `## Available Basecamp Projects\n\n${projectList}\n\nTotal: ${projects.length} project(s)`,
        },
      ],
    };
  }

  private async handleFetchTodos(args: {
    projectName: string;
    tableName?: string;
    columnName?: string;
    outputPath?: string;
  }) {
    const { projectName, tableName, columnName, outputPath } = args;

    await this.fetcher.fetchTodos(projectName, {
      tableName,
      columnName,
      outputPath,
    });

    const outputFile = outputPath || '.codex/tasks.json';
    const markdownFile = outputPath?.replace('.json', '.md') || '.codex/tasks.md';

    return {
      content: [
        {
          type: 'text',
          text: `✅ Successfully fetched todos from project **${projectName}**\n\nFiles created:\n- \`${outputFile}\` - JSON format for Codex CLI\n- \`${markdownFile}\` - Human-readable Markdown format\n\nYou can now load these tasks into Codex CLI or use them in your project.`,
        },
      ],
    };
  }

  private async handleAuthenticate(args: { openBrowser?: boolean }) {
    const { openBrowser = true } = args;

    await this.fetcher.authenticate(openBrowser);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Successfully authenticated with Basecamp!\n\nYou can now use other Basecamp tools.`,
        },
      ],
    };
  }

  private async handleGetProjectInfo(args: { projectName: string }) {
    const { projectName } = args;
    const projects = await this.fetcher.listProjects();

    const project = projects.find(p => p.name.toLowerCase() === projectName.toLowerCase());

    if (!project) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Project **${projectName}** not found.\n\nAvailable projects:\n${projects
              .map(p => `- ${p.name}`)
              .join('\n')}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `## Project Information\n\n**Name:** ${project.name}\n**ID:** ${project.id}\n**Status:** ${
            project.archived ? 'Archived' : 'Active'
          }\n\nYou can use this project with the \`fetch_todos\` tool.`,
        },
      ],
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Basecamp MCP server started');
  }
}

// Run the server if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new BasecampMCPServer();
  server.run().catch(error => {
    console.error('MCP server error:', error);
    process.exit(1);
  });
}
