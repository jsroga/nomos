#!/usr/bin/env node
/**
 * World Building Kit MCP Server
 *
 * Exposes the application's functionality via Model Context Protocol (MCP)
 * for use by AI agents, bots, and workflows.
 *
 * Transport: stdio (standard input/output)
 * Authentication: API key via environment variable
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

import { validateApiKey, getServiceContext } from './auth'
import { getAllTools, handleToolCall } from './tools'
import { getAllResources, handleResourceRead } from './resources'

// ============================================
// SERVER INITIALIZATION
// ============================================

const server = new Server(
  {
    name: 'world-building-kit',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
)

// ============================================
// TOOL HANDLERS
// ============================================

/**
 * List all available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = getAllTools()
  return { tools }
})

/**
 * Execute a tool call
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  // Validate API key and get service context
  const apiKey = process.env.MCP_API_KEY
  if (!apiKey) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: 'MCP_API_KEY environment variable not set' }),
        },
      ],
      isError: true,
    }
  }

  try {
    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'Invalid API key' }),
          },
        ],
        isError: true,
      }
    }

    const context = await getServiceContext(authResult)

    // Build LangSmith context for tracing
    const langsmithContext = {
      runName: `MCP: ${name}`,
      tags: ['mcp', `tool:${name}`, `key:${authResult.keyName}`],
      metadata: {
        source: 'mcp',
        apiKeyId: authResult.keyId,
        apiKeyName: authResult.keyName,
        toolName: name,
      },
    }

    const result = await handleToolCall(name, args || {}, context, langsmithContext)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  } catch (error: any) {
    console.error(`[MCP] Error executing tool ${name}:`, error)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error.message || 'Internal error',
            code: error.code || 'INTERNAL_ERROR',
          }),
        },
      ],
      isError: true,
    }
  }
})

// ============================================
// RESOURCE HANDLERS
// ============================================

/**
 * List all available resources
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const resources = getAllResources()
  return { resources }
})

/**
 * Read a specific resource
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params

  // Validate API key
  const apiKey = process.env.MCP_API_KEY
  if (!apiKey) {
    throw new Error('MCP_API_KEY environment variable not set')
  }

  try {
    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) {
      throw new Error('Invalid API key')
    }

    const context = await getServiceContext(authResult)
    const content = await handleResourceRead(uri, context)

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(content, null, 2),
        },
      ],
    }
  } catch (error: any) {
    console.error(`[MCP] Error reading resource ${uri}:`, error)
    throw error
  }
})

// ============================================
// SERVER STARTUP
// ============================================

async function main() {
  console.error('[MCP] Starting World Building Kit MCP Server...')

  const transport = new StdioServerTransport()
  await server.connect(transport)

  console.error('[MCP] Server connected and ready')
}

main().catch((error) => {
  console.error('[MCP] Fatal error:', error)
  process.exit(1)
})

