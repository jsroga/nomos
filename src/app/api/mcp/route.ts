import { server } from '@/mcp/server'
import { validateApiKey, getServiceContext } from '@/mcp/core/auth'
import { requestContext } from '@/mcp/core/request-context'
import type { NextRequest } from 'next/server'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function readRequestBody(request: NextRequest): Promise<unknown> {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return undefined
  }
  try {
    return await request.json()
  } catch {
    return undefined
  }
}

function toIncomingMessage(request: NextRequest, body: unknown): IncomingMessage {
  const socket = new Socket()
  const req = new IncomingMessage(socket)
  const url = new URL(request.url)
  req.method = request.method
  req.url = `${url.pathname}${url.search}`
  req.headers = Object.fromEntries(request.headers.entries()) as IncomingMessage['headers']
  ;(req as IncomingMessage & { body?: unknown }).body = body
  return req
}

function createCapturingServerResponse(
  req: IncomingMessage
): { res: ServerResponse<IncomingMessage>; toWebResponse: () => Promise<Response> } {
  const res = new ServerResponse(req)
  const chunks: Buffer[] = []

  res.write = ((chunk: unknown) => {
    if (chunk) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
    }
    return true
  }) as typeof res.write

  const responsePromise = new Promise<Response>((resolve) => {
    res.end = ((chunk?: unknown) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
      }
      const headers = new Headers()
      for (const [key, value] of Object.entries(res.getHeaders())) {
        if (value === undefined) continue
        headers.set(key, Array.isArray(value) ? value.join(', ') : String(value))
      }
      resolve(
        new Response(chunks.length ? Buffer.concat(chunks) : null, {
          status: res.statusCode || 200,
          headers,
        })
      )
      return res
    }) as typeof res.end
  })

  return { res, toWebResponse: () => responsePromise }
}

async function handleMcp(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Missing or invalid Authorization header' }, { status: 401 })
  }

  const providedKey = authHeader.split(' ')[1]

  try {
    const authResult = await validateApiKey(providedKey)
    if (!authResult.valid) {
      return Response.json({ error: 'Forbidden: Invalid API Key' }, { status: 403 })
    }

    const context = await getServiceContext(authResult)
    const body = await readRequestBody(request)
    const url = new URL(request.url)
    const nodeReq = toIncomingMessage(request, body)
    const { res, toWebResponse } = createCapturingServerResponse(nodeReq)

    await requestContext.run(context, async () => {
      await server.startHTTP({
        url,
        httpPath: '/api/mcp',
        req: nodeReq,
        res,
        options: {
          serverless: true,
        },
      })
    })

    return await toWebResponse()
  } catch (error) {
    console.error('MCP Handler Error:', error)
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return handleMcp(request)
}

export async function POST(request: NextRequest) {
  return handleMcp(request)
}

export async function DELETE(request: NextRequest) {
  return handleMcp(request)
}
