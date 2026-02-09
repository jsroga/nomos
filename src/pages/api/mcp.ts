import { server } from '@/mcp/server'
import { NextApiRequest, NextApiResponse } from 'next'
import { validateApiKey, getServiceContext } from '@/mcp/core/auth'
import { requestContext } from '@/mcp/core/request-context'

// Vercel/Next.js function configuration
export const config = {
  api: {
    bodyParser: false, // Disable body parser for streaming/SSE
    externalResolver: true, // Allow external resolver (Mastra server)
  },
}

/**
 * Handle MCP requests over HTTP (using stdio logic won't work).
 * We need to use server.startHTTP() logic but adapted to Next.js handler.
 *
 * However, MCPServer currently exposes startHTTP() which starts a Node.js server.
 * It does NOT expose a handleRequest() method suitable for Next.js directly in the public API easily.
 *
 * WORKAROUND:
 * We can try to use `handleServerlessRequest` if available (it was private in d.ts but might be usable or similar).
 * OR we can inspect if `connectSSE` is sufficient.
 *
 * Let's try to use `startHTTP` in serverless mode if possible.
 * But `startHTTP` listens on a port.
 *
 * Actually, looking at `d.ts`, `startHTTP` has `options: { serverless: true }`.
 * And it takes `req, res`.
 * So we can call it!
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Security Check: Validate Authorization Header
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' })
  }

  const providedKey = authHeader.split(' ')[1]

  try {
    // Validate the key against the database (supports multi-tenancy)
    const authResult = await validateApiKey(providedKey)
    if (!authResult.valid) {
      return res.status(403).json({ error: 'Forbidden: Invalid API Key' })
    }

    // Get the service context (User ID, etc.)
    const context = await getServiceContext(authResult)

    // 2. Execute with Request Context
    // Wrap the execution in AsyncLocalStorage so tools can access the context
    await requestContext.run(context, async () => {
      const protocol = req.headers['x-forwarded-proto'] || 'http'
      const host = req.headers.host || 'localhost:3000'
      const url = new URL(req.url || '/api/mcp', `${protocol}://${host}`)

      // startHTTP in serverless mode handles the request and response
      await server.startHTTP({
        url,
        httpPath: '/api/mcp',
        req,
        res,
        options: {
          serverless: true,
        },
      })
    })
  } catch (error) {
    console.error('MCP Handler Error:', error)
    if (!res.writableEnded) {
      res.status(500).json({ error: 'Internal Server Error' })
    }
  }
}
