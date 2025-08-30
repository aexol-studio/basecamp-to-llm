#!/usr/bin/env tsx

/**
 * Example of using the Basecamp MCP server programmatically
 * 
 * This example shows how to start the MCP server and use it
 * in your own applications.
 */

import { BasecampMCPServer } from '../src/mcp-server.js';

async function main(): Promise<void> {
  try {
    console.log('🚀 Starting Basecamp MCP server...');
    
    const server = new BasecampMCPServer();
    await server.run();
    
    console.log('✅ MCP server is running and ready to accept connections');
    console.log('📝 This server can be used with Codex and Cursor');
    console.log('🔧 Use the configuration files in configs/ directory');
    
  } catch (error) {
    console.error('❌ Error starting MCP server:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
