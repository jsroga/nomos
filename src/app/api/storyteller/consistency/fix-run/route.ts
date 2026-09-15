import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/shared/auth/auth'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import {
  ContentType,
  HttpHeader,
  SseAccelBuffering,
  SseCacheControl,
  SseHeader,
} from '@/shared/data/constants/protocol'
import { tryProjectScope } from '@/shared/auth/project-scope'
import '@/domains/storyteller/core/io/mastra-runtime'
import { createMastraTraceId } from '@/domains/storyteller/server'
import {
  encodeFixInconsistenciesSse,
  encodeFixInconsistenciesSseComment,
  FixInconsistenciesSseEvent,
} from '@/domains/storyteller/core/io/fix-inconsistencies-sse'
import {
  pipeFixInconsistenciesStartToSse,
  type FixInconsistenciesSseSink,
} from '@/domains/storyteller/core/io/fix-inconsistencies-sse-run'

export const maxDuration = 800

const StartSchema = z.object({
  projectId: z.string().min(1),
})

function sseHeaders(traceId: string): HeadersInit {
  return {
    'Content-Type': SseHeader.ContentType,
    'Cache-Control': SseCacheControl.NoCacheNoTransform,
    Connection: SseHeader.Connection,
    'X-Accel-Buffering': SseAccelBuffering.No,
    [HttpHeader.TRACE_ID]: traceId,
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const payload = StartSchema.safeParse(await request.json())
    if (!payload.success) {
      return NextResponse.json({ error: API_ERROR.INVALID_PAYLOAD }, { status: 400 })
    }

    const { projectId } = payload.data
    const scope = await tryProjectScope(projectId, session.user.id)
    if (!scope) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    const encoder = new TextEncoder()
    const traceId = createMastraTraceId()
    const stream = new ReadableStream({
      async start(controller) {
        const send: FixInconsistenciesSseSink['send'] = (event, data) => {
          controller.enqueue(encoder.encode(encodeFixInconsistenciesSse(event, data)))
        }
        const flush = () =>
          new Promise<void>(resolve => {
            controller.enqueue(encoder.encode(encodeFixInconsistenciesSseComment()))
            setImmediate(resolve)
          })
        try {
          await pipeFixInconsistenciesStartToSse({
            projectId,
            scope,
            traceId,
            sink: { send, flush },
          })
        } catch (error) {
          console.error(API_LOG_PREFIX.FIX_INCONSISTENCIES_RUN_ERROR, error)
          send(FixInconsistenciesSseEvent.Error, {
            message: error instanceof Error ? error.message : API_ERROR.INTERNAL_SERVER_ERROR,
          })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, { headers: sseHeaders(traceId) })
  } catch (error) {
    console.error(API_LOG_PREFIX.FIX_INCONSISTENCIES_RUN_ERROR, error)
    return NextResponse.json(
      { error: API_ERROR.INTERNAL_SERVER_ERROR },
      { status: 500, headers: { 'Content-Type': ContentType.Json } }
    )
  }
}
