#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  BasecampClient,
  type HttpMethod,
  type RequestOptions,
} from "./sdk/client.js";
import { BasecampAuth } from "./auth.js";
import { actions as sdkActions } from "./sdk/registry.js";
import { downloadAttachment } from "./sdk/resources/enrichedCards.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __mcp_dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(path.join(__mcp_dirname, "..", "package.json"), "utf-8"),
) as {
  version: string;
};

export class BasecampMCPServer {
  private server: McpServer;
  private safeToOriginal = new Map<string, string>();

  /**
   * Type-safe wrapper around McpServer.registerTool that prevents TS2589
   * "excessively deep type instantiation" caused by Zod generic inference
   * under strict tsconfig settings. The `any` cast is confined to this
   * boundary; callers provide explicitly-typed handler args.
   */

  private registerTool(
    name: string,
    config: { description: string; inputSchema: Record<string, z.ZodTypeAny> },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: (args: any, extra: any) => Promise<CallToolResult>,
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.server.registerTool as any)(name, config, handler);
  }

  constructor() {
    this.server = new McpServer({
      name: "basecamp-to-llm",
      version: pkg.version,
    });

    // Ensure any internal logs from helpers go to stderr to avoid
    // corrupting the MCP stdio protocol on stdout.
    process.env["BASECAMP_MCP_STDERR"] = "1";

    this.registerTools();
  }

  private registerTools(): void {
    // --- authenticate ---
    this.registerTool(
      "authenticate",
      {
        description: "Authenticate with Basecamp (opens browser for OAuth)",
        inputSchema: {
          openBrowser: z
            .boolean()
            .optional()
            .describe("Whether to open browser for OAuth (default: true)"),
        },
      },
      async (args: { openBrowser: boolean | undefined }) => {
        return await this.handleAuthenticate({ openBrowser: args.openBrowser });
      },
    );

    // --- api_request ---
    this.registerTool(
      "api_request",
      {
        description:
          "Generic Basecamp API request (exposes full API surface). Path is relative to account unless absolute=true.",
        inputSchema: {
          method: z
            .string()
            .describe("HTTP method: GET, POST, PUT, PATCH, DELETE, HEAD"),
          path: z
            .string()
            .describe(
              "API path like /projects.json or absolute URL like https://3.basecampapi.com/{account}/projects.json",
            ),
          query: z
            .record(z.unknown())
            .optional()
            .describe("Optional query parameters as key/value map"),
          body: z
            .unknown()
            .optional()
            .describe("Optional JSON body for write methods"),
          absolute: z
            .boolean()
            .optional()
            .describe("Treat path as absolute URL (default: false)"),
        },
      },
      async (args: {
        method: string;
        path: string;
        query: Record<string, unknown> | undefined;
        body: unknown;
        absolute: boolean | undefined;
      }) => {
        return await this.handleApiRequest({
          method: args.method,
          path: args.path,
          query: args.query,
          body: args.body,
          absolute: args.absolute,
        });
      },
    );

    // --- Dynamic SDK actions from registry ---
    const toSafe = (raw: string): string => {
      const base = "sdk_" + raw.replace(/[^A-Za-z0-9_-]/g, "_");
      let name = base;
      let i = 2;
      while (this.safeToOriginal.has(name)) name = `${base}_${i++}`;
      return name;
    };

    for (const action of sdkActions) {
      const safeName = toSafe(action.name);
      this.safeToOriginal.set(safeName, action.name);

      this.registerTool(
        safeName,
        {
          description: action.description,
          inputSchema: action.zodSchema,
        },
        async (args: Record<string, unknown>) => {
          try {
            const client = new BasecampClient();
            const res = await action.handler(client, args);

            // Handle image responses - return as image content block for LLM vision
            if (
              res &&
              typeof res === "object" &&
              "base64" in res &&
              "mimeType" in res
            ) {
              const { base64, mimeType } = res as {
                base64: string;
                mimeType: string;
              };
              if (
                typeof mimeType === "string" &&
                mimeType.startsWith("image/")
              ) {
                return {
                  content: [{ type: "image" as const, data: base64, mimeType }],
                };
              }
            }

            return {
              content: [
                {
                  type: "text" as const,
                  text:
                    typeof res === "string"
                      ? res
                      : JSON.stringify(res, null, 2),
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                },
              ],
            };
          }
        },
      );
    }

    // --- sdk_attachments_download ---
    this.registerTool(
      "sdk_attachments_download",
      {
        description:
          "Download an attachment/image from Basecamp. Returns base64 data and saves to .basecamp/images/. Use downloadUrl from enriched card images.",
        inputSchema: {
          url: z.string().describe("Download URL from image.downloadUrl"),
          filename: z.string().optional().describe("Filename to save as"),
          mimeType: z
            .string()
            .optional()
            .describe("MIME type (e.g., image/png)"),
          imageQuality: z
            .enum(["full", "preview", "thumbnail"])
            .optional()
            .describe(
              "Image quality: full (original), preview (medium, default), thumbnail (smallest)",
            ),
        },
      },
      async (args: {
        url: string;
        filename: string | undefined;
        mimeType: string | undefined;
      }) => {
        try {
          const client = new BasecampClient();
          const result = await downloadAttachment(
            client,
            args.url,
            args.filename,
            args.mimeType,
          );

          // Return image as content block for LLM vision
          if (result.base64 && result.mimeType.startsWith("image/")) {
            return {
              content: [
                {
                  type: "image" as const,
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
                type: "text" as const,
                text: JSON.stringify(
                  {
                    filename: result.filename,
                    mimeType: result.mimeType,
                    savedPath: result.savedPath,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          };
        }
      },
    );
  }

  private async handleApiRequest(args: {
    method: string;
    path: string;
    query?: Record<string, unknown> | undefined;
    body?: unknown;
    absolute?: boolean | undefined;
  }) {
    const client = new BasecampClient();
    const method = args.method.toUpperCase() as HttpMethod;
    type QueryParams = Record<string, string | number | boolean | undefined>;
    const reqOptions: RequestOptions = { absolute: !!args.absolute };
    if (args.query) reqOptions.query = args.query as QueryParams;
    if (args.body !== undefined) reqOptions.body = args.body;
    const res = await client.request(method, args.path, reqOptions);
    const text = typeof res === "string" ? res : JSON.stringify(res, null, 2);
    return {
      content: [
        {
          type: "text" as const,
          text,
        },
      ],
    };
  }

  private async handleAuthenticate(args: {
    openBrowser?: boolean | undefined;
  }) {
    const { openBrowser = true } = args;

    const auth = new BasecampAuth();
    await auth.authenticate(openBrowser);

    return {
      content: [
        {
          type: "text" as const,
          text: `✅ Successfully authenticated with Basecamp!\n\nYou can now use other Basecamp tools.`,
        },
      ],
    };
  }

  private async autoAuthenticate(): Promise<void> {
    const auth = new BasecampAuth();

    // First try silent auth (cached token or refresh)
    const token = await auth.tryAutoAuth();
    if (token) {
      console.error("✅ Authenticated with cached/refreshed token");
      return;
    }

    // No cached token - do full OAuth with browser
    console.error(
      "No valid token found. Opening browser for authentication...",
    );
    await auth.authenticate(true); // always open browser
    console.error("✅ Authentication successful");
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Basecamp MCP server started");

    // Auto-authenticate: try cached token or refresh silently
    // If neither works, open browser for full OAuth
    this.autoAuthenticate().catch((err) => {
      console.error(
        "Auto-authentication failed:",
        err instanceof Error ? err.message : String(err),
      );
      console.error("Tools will prompt for authentication when called.");
    });
  }
}

// Run the server if this file is executed directly (ESM-compatible)
try {
  const invokedPath = process.argv?.[1];
  const thisPath = fileURLToPath(import.meta.url);
  const isDirect = invokedPath ? path.resolve(invokedPath) === thisPath : false;
  if (isDirect) {
    const server = new BasecampMCPServer();
    server.run().catch((error) => {
      console.error("MCP server error:", error);
      process.exit(1);
    });
  }
} catch {}
