#!/usr/bin/env node
import { server } from './server'
import { MCP_STDIO_START_FAILED_LOG } from './constants/stdio'

// Start the server using stdio transport
// This allows it to be used by MCP clients like Claude Desktop or Cursor
try {
  await server.startStdio()
} catch (err) {
  console.error(MCP_STDIO_START_FAILED_LOG, err)
  process.exit(1)
}
