#!/usr/bin/env node
import { server } from './server'

// Start the server using stdio transport
// This allows it to be used by MCP clients like Claude Desktop or Cursor
server.startStdio().catch(err => {
  console.error('Failed to start MCP server:', err)
  process.exit(1)
})
