#!/usr/bin/env tsx

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main(): Promise<void> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const serverPath = join(__dirname, '..', 'dist', 'mcp-server.js');

  const client = new Client({ name: 'basecamp-mcp-local-client', version: '1.0.0' });
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath],
    env: process.env as Record<string, string>,
  });

  console.log('🔌 Connecting to local MCP server...');
  await client.connect(transport);
  console.log('✅ Connected');

  console.log('\n🔍 Listing tools...');
  const tools = await client.listTools();
  for (const t of tools.tools) {
    console.log(`- ${t.name}: ${t.description ?? ''}`);
  }

  console.log('\n📚 Listing typed SDK actions via sdk_list_actions...');
  const listActions = await client.callTool({ name: 'sdk_list_actions', arguments: {} });
  const text = listActions.content?.find(c => c.type === 'text') as { type: 'text'; text: string } | undefined;
  if (text?.text) {
    try {
      const parsed = JSON.parse(text.text);
      console.log(JSON.stringify(parsed, null, 2));
    } catch {
      console.log(text.text);
    }
  } else {
    console.log('(No action list returned)');
  }

  if (
    process.env['BASECAMP_CLIENT_ID'] &&
    process.env['BASECAMP_CLIENT_SECRET'] &&
    process.env['BASECAMP_REDIRECT_URI'] &&
    process.env['BASECAMP_USER_AGENT']
  ) {
    console.log('\n🧪 Attempting a lightweight call: list_projects');
    const res = await client.callTool({ name: 'list_projects', arguments: {} });
    const out = res.content?.find(c => c.type === 'text') as { type: 'text'; text: string } | undefined;
    console.log(out?.text ?? '(no text result)');
  } else {
    console.log('\n⚠️  Basecamp env not fully set; skipping live API calls.');
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('❌ MCP client error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}

