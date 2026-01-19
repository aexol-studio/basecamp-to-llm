#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { BasecampFetcher } from './basecamp-fetcher.js';
import { BasecampClient, type HttpMethod, type RequestOptions } from './sdk/client.js';
import { actions as sdkActions } from './sdk/registry.js';
import { downloadAttachment } from './sdk/resources/enrichedCards.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export class BasecampMCPServer {
  private server: Server;
  private fetcher?: BasecampFetcher;
  private safeToOriginal = new Map<string, string>();
  private originalToSafe = new Map<string, string>();

  constructor() {
    this.server = new Server({
      name: 'basecamp-to-llm',
      version: '1.0.0',
    });

    // Ensure any internal logs from helpers go to stderr to avoid
    // corrupting the MCP stdio protocol on stdout.
    process.env['BASECAMP_MCP_STDERR'] = '1';

    this.setupTools();
  }

  private getFetcher(): BasecampFetcher {
    if (!this.fetcher) this.fetcher = new BasecampFetcher();
    return this.fetcher;
  }

  private setupTools(): void {
    // List projects tool
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      // Build MCP-safe names for SDK actions (no colon or dot)
      this.safeToOriginal.clear();
      this.originalToSafe.clear();
      const toSafe = (raw: string): string => {
        const base = 'sdk_' + raw.replace(/[^A-Za-z0-9_-]/g, '_');
        let name = base;
        let i = 2;
        while (this.safeToOriginal.has(name)) name = `${base}_${i++}`;
        return name;
      };
      const sdkTools = sdkActions.map(a => {
        const safe = toSafe(a.name);
        this.safeToOriginal.set(safe, a.name);
        this.originalToSafe.set(a.name, safe);
        return {
          name: safe,
          description: a.description,
          inputSchema: a.schema || { type: 'object', properties: {} },
        };
      });

      return {
        tools: [
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
            name: 'api_request',
            description:
              'Generic Basecamp API request (exposes full API surface). Path is relative to account unless absolute=true.',
            inputSchema: {
              type: 'object',
              properties: {
                method: {
                  type: 'string',
                  description: 'HTTP method: GET, POST, PUT, PATCH, DELETE, HEAD',
                },
                path: {
                  type: 'string',
                  description:
                    'API path like /projects.json or absolute URL like https://3.basecampapi.com/{account}/projects.json',
                },
                query: {
                  type: 'object',
                  description: 'Optional query parameters as key/value map',
                },
                body: {
                  type: 'object',
                  description: 'Optional JSON body for write methods',
                },
                absolute: {
                  type: 'boolean',
                  description: 'Treat path as absolute URL',
                  default: false,
                },
              },
              required: ['method', 'path'],
            },
          },
          // Dynamic SDK actions (MCP-safe names)
          ...sdkTools,
          // Attachments download (special handling for images)
          {
            name: 'sdk_attachments_download',
            description:
              'Download an attachment/image from Basecamp. Returns base64 data and saves to .basecamp/images/. Use downloadUrl from enriched card images.',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'Download URL from image.downloadUrl',
                },
                filename: {
                  type: 'string',
                  description: 'Filename to save as',
                },
                mimeType: {
                  type: 'string',
                  description: 'MIME type (e.g., image/png)',
                },
              },
              required: ['url'],
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
          case 'authenticate':
            return await this.handleAuthenticate((args as { openBrowser?: boolean }) || {});

          case 'api_request':
            return await this.handleApiRequest(
              (args as {
                method: string;
                path: string;
                query?: Record<string, unknown>;
                body?: unknown;
                absolute?: boolean;
              }) || { method: 'GET', path: '' }
            );

          case 'sdk_attachments_download': {
            const { url, filename, mimeType } = args as {
              url: string;
              filename?: string;
              mimeType?: string;
            };
            const client = new BasecampClient();
            const result = await downloadAttachment(client, url, filename, mimeType);

            // Return image as content block for LLM vision
            if (result.base64 && result.mimeType.startsWith('image/')) {
              return {
                content: [
                  {
                    type: 'image',
                    data: result.base64,
                    mimeType: result.mimeType,
                  },
                ],
              };
            }

            // Fallback: return metadata only
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      filename: result.filename,
                      mimeType: result.mimeType,
                      savedPath: result.savedPath,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          default: {
            // Accept both original names like 'sdk:projects.list' and safe names like 'sdk_projects_list'
            let originalName: string | undefined;
            if (name?.startsWith('sdk:')) {
              originalName = name.slice(4);
            } else if (this.safeToOriginal.has(name)) {
              originalName = this.safeToOriginal.get(name);
            }

            if (originalName) {
              const def = sdkActions.find(a => a.name === originalName);
              if (!def) throw new Error(`Unknown SDK action: ${originalName}`);
              const client = new BasecampClient();
              const res = await def.handler(client, (args as Record<string, unknown>) ?? {});

              // Handle image responses - return as image content block for LLM vision
              if (res && typeof res === 'object' && 'base64' in res && 'mimeType' in res) {
                const { base64, mimeType } = res as { base64: string; mimeType: string };
                if (typeof mimeType === 'string' && mimeType.startsWith('image/')) {
                  return {
                    content: [
                      {
                        type: 'image',
                        data: base64,
                        mimeType: mimeType,
                      },
                    ],
                  };
                }
              }

              // Default: return as text/JSON
              return {
                content: [
                  {
                    type: 'text',
                    text: typeof res === 'string' ? res : JSON.stringify(res, null, 2),
                  },
                ],
              };
            }
            throw new Error(`Unknown tool: ${name}`);
          }
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

  private async handleApiRequest(args: {
    method: string;
    path: string;
    query?: Record<string, unknown>;
    body?: unknown;
    absolute?: boolean;
  }) {
    const client = new BasecampClient();
    const method = args.method.toUpperCase() as HttpMethod;
    type QueryParams = Record<string, string | number | boolean | undefined>;
    const reqOptions: RequestOptions = { absolute: !!args.absolute };
    if (args.query) reqOptions.query = args.query as QueryParams;
    if (args.body !== undefined) reqOptions.body = args.body;
    const res = await client.request(method, args.path, reqOptions);
    const text = typeof res === 'string' ? res : JSON.stringify(res, null, 2);
    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  }

  private async handleAuthenticate(args: { openBrowser?: boolean }) {
    const { openBrowser = true } = args;

    await this.getFetcher().authenticate(openBrowser);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Successfully authenticated with Basecamp!\n\nYou can now use other Basecamp tools.`,
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

// Run the server if this file is executed directly (ESM-compatible)
try {
  const invokedPath = process.argv?.[1];
  const thisPath = fileURLToPath(import.meta.url);
  const isDirect = invokedPath ? path.resolve(invokedPath) === thisPath : false;
  if (isDirect) {
    const server = new BasecampMCPServer();
    server.run().catch(error => {
      console.error('MCP server error:', error);
      process.exit(1);
    });
  }
  // eslint-disable-next-line no-empty
} catch {}
