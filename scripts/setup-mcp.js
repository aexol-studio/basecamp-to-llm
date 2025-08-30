#!/usr/bin/env node

/**
 * Setup script for MCP integration
 * This script helps users configure the MCP server for Codex and Cursor
 */

const fs = require('fs');
const path = require('path');

function createDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dirPath}`);
  }
}

function copyConfig(source, target) {
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, target);
    console.log(`✅ Copied config to: ${target}`);
  } else {
    console.log(`❌ Source config not found: ${source}`);
  }
}

function main() {
  console.log('🚀 Setting up Basecamp MCP integration...\n');

  const packageRoot = path.resolve(__dirname, '..');
  const configsDir = path.join(packageRoot, 'configs');

  // Check if configs directory exists
  if (!fs.existsSync(configsDir)) {
    console.log('❌ Configs directory not found. Make sure you\'re running this from the package root.');
    process.exit(1);
  }

  // Setup Codex config
  const codexSource = path.join(configsDir, 'codex.json');
  const codexTarget = path.join(process.cwd(), '.codex', 'config.json');
  
  console.log('📝 Setting up Codex configuration...');
  createDirectory(path.dirname(codexTarget));
  copyConfig(codexSource, codexTarget);

  // Setup Cursor config
  const cursorSource = path.join(configsDir, 'cursor.json');
  const cursorTarget = path.join(process.cwd(), '.cursor', 'config.json');
  
  console.log('\n📝 Setting up Cursor configuration...');
  createDirectory(path.dirname(cursorTarget));
  copyConfig(cursorSource, cursorTarget);

  console.log('\n🎉 MCP setup complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Set your Basecamp environment variables:');
  console.log('   export BASECAMP_CLIENT_ID="your_client_id"');
  console.log('   export BASECAMP_CLIENT_SECRET="your_client_secret"');
  console.log('   export BASECAMP_REDIRECT_URI="http://localhost:8787/callback"');
  console.log('   export BASECAMP_USER_AGENT="Your App Name (your@email.com)"');
  console.log('\n2. Restart your IDE (Codex or Cursor)');
  console.log('\n3. Test the integration by asking:');
  console.log('   "Can you list my Basecamp projects?"');
  console.log('\n📖 For detailed instructions, see MCP_SETUP.md');
}

if (require.main === module) {
  main();
}
