import { NextRequest, NextResponse } from 'next/server'
import { mcpServer } from '@/infrastructure/mcp/server'
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js'

/**
 * MCP Server API Route
 *
 * Handles JSON-RPC 2.0 requests from MCP clients according to the specification.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Process the JSON-RPC request using our MCP server instance
    // Since we are in a stateless HTTP environment (Next.js API route),
    // we manually bridge the request to the server's internal router if possible,
    // or use a mock transport to trigger the handler.

    // The MCP Server doesn't have a direct 'handleMessage' for stateless requests in the current SDK version.
    // We need to use a transport or access the request handler directly.
    // For now, let's use a more robust way to handle this or cast to any if we know the method exists on an internal property.
    const server = mcpServer.getServer() as any
    const response = await server.handleMessage(body as JSONRPCMessage)

    if (!response) {
      return new NextResponse(null, { status: 204 })
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[MCP Error]', error)
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error.message || 'Internal server error',
        },
        id: null,
      },
      { status: 500 }
    )
  }
}

// Optional: Handle OPTIONS for CORS if needed
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
