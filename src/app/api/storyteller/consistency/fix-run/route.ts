import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/shared/auth/auth'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { ContentType, SseHeader } from '@/shared/data/constants/protocol'
import { verifyProjectAccess } from '@/domains/storyteller/server'
import '@/domains/storyteller/core/io/mastra-runtime'
import { encodeFixInconsistenciesSse } from '@/domains/storyteller/core/io/fix-inconsistencies-sse'
import {
  createFixInconsistenciesWorkflowRun,
  executeFixInconsistenciesStart,
} from '@/domains/storyteller/core/io/fix-inconsistencies-run'
import {
  FixInconsistenciesRunStatus,
  FixInconsistenciesSseEvent,
  FixInconsistenciesStepId,
} from '@/domains/storyteller/ai/workflows/constants/fix-inconsistencies-workflow'

export const maxDuration = 300

const StartSchema = z.object({
  projectId: z.string().min(1),
})

function sseHeaders(): HeadersInit {
  return {
    'Content-Type': SseHeader.ContentType,
    'Cache-Control': SseHeader.CacheControl,
    Connection: SseHeader.Connection,
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
    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: FixInconsistenciesSseEvent, data: unknown) => {
          controller.enqueue(encoder.encode(encodeFixInconsistenciesSse(event, data)))
        }
        try {
          const created = await createFixInconsistenciesWorkflowRun()
          if (!created.ok) {
            send(FixInconsistenciesSseEvent.Error, { message: created.error })
            return
          }
          send(FixInconsistenciesSseEvent.Started, { runId: created.run.runId, projectId })
          send(FixInconsistenciesSseEvent.Step, { stepId: FixInconsistenciesStepId.AssembleCanon })
          const result = await executeFixInconsistenciesStart(created.run, projectId)
          if (!result.ok) {
            send(FixInconsistenciesSseEvent.Error, { runId: result.runId, message: result.error })
            return
          }
          if (result.status === FixInconsistenciesRunStatus.Suspended) {
            send(FixInconsistenciesSseEvent.Suspended, {
              runId: result.runId,
              ...result.payload,
            })
          } else {
            send(FixInconsistenciesSseEvent.Complete, {
              runId: result.runId,
              ...result.output,
            })
          }
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

    return new Response(stream, { headers: sseHeaders() })
  } catch (error) {
    console.error(API_LOG_PREFIX.FIX_INCONSISTENCIES_RUN_ERROR, error)
    return NextResponse.json(
      { error: API_ERROR.INTERNAL_SERVER_ERROR },
      { status: 500, headers: { 'Content-Type': ContentType.Json } }
    )
  }
}
