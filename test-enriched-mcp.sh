#!/bin/bash

# Test MCP server enriched card endpoint
echo "Testing enriched card with images..."

# Start MCP server in background
export BASECAMP_CLIENT_ID="6bbb877729a32f4e2dd56a9402104f04af6eae7a"
export BASECAMP_CLIENT_SECRET="14b273c1576836cd06db875b757b3eaeb777be8c"
export BASECAMP_REDIRECT_URI="http://localhost:5175/callback"
export BASECAMP_USER_AGENT="Project Tree (office@aexol.com)"

node dist/mcp-server.js &
MCP_PID=$!

sleep 2

# Send test request (simulate MCP call)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"sdk_card_tables_get_enriched","arguments":{"projectId":44796620,"cardId":9304415066,"downloadImages":true}}}' | node dist/mcp-server.js

# Cleanup
kill $MCP_PID 2>/dev/null

echo "Test complete"
