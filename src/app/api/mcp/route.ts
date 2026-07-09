import { server } from '@/mcp/server'
import { validateApiKey, getServiceContext } from '@/mcp/core/auth'
import { requestContext } from '@/mcp/core/request-context'
import type { NextRequest } from 'next/server'
import type { IncomingHttpHeaders } from 'node:http'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface IncomingMessageWithBody extends IncomingMessage {
  body?: unknown
}

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

function headersFromRequest(request: NextRequest): IncomingHttpHeaders {
  const headers: IncomingHttpHeaders = {}
  for (const [key, value] of request.headers.entries()) {
    headers[key] = value
  }
  return headers
}

function toIncomingMessage(request: NextRequest, body: unknown): IncomingMessageWithBody {
  const socket = new Socket()
  const req = new IncomingMessage(socket)
  const url = new URL(request.url)
  req.method = request.method
  req.url = `${url.pathname}${url.search}`
  req.headers = headersFromRequest(request)
  return Object.assign(req, { body })
}

class CapturingServerResponse extends ServerResponse<IncomingMessage> {
  private readonly chunks: Buffer[] = []
  private readonly responsePromise: Promise<Response>
  private resolveResponse!: (response: Response) => void

  constructor(req: IncomingMessage) {
    super(req)
    this.responsePromise = new Promise<Response>(resolve => {
      this.resolveResponse = resolve
    })
  }

  toWebResponse(): Promise<Response> {
    return this.responsePromise
  }

  override write(chunk: unknown): boolean {
    if (chunk) {
      this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
    }
    return true
  }

  override end(chunk?: unknown): this {
    if (chunk) {
      this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
    }
    const headers = new Headers()
    for (const [key, value] of Object.entries(this.getHeaders())) {
      if (value === undefined) continue
      headers.set(key, Array.isArray(value) ? value.join(', ') : String(value))
    }
    this.resolveResponse(
      new Response(this.chunks.length ? Buffer.concat(this.chunks) : null, {
        status: this.statusCode || 200,
        headers,
      })
    )
    return this
  }
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
    const res = new CapturingServerResponse(nodeReq)

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

    return await res.toWebResponse()
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
