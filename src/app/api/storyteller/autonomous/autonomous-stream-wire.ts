/**
 * Autonomous durable-draft SSE stream (flagged: STORYTELLER_AUTONOMOUS=1).
 *
 * Starts the durable goals loop (`startAutonomousEpisodeDraft`) and maps its
 * fullStream — the same Mastra chunk format as `agent.stream()` — to the frozen
 * `ChatFrameType` frames via the existing `stream-wire` emitters, so the UI needs
 * no new vocabulary. The one addition is the `goal` chunk (`GoalEvaluationPayload`),
 * surfaced as a progress Info frame.
 *
 * `-wire.ts` so the wire literals are exempt from no-magic-string.
 */

import { startAutonomousEpisodeDraft } from '@/domains/storyteller/core/io/mastra-runtime'
import { readNumber, readString, recordFromJson } from '@/shared/data/json-guards'
import { ChatFrameType } from '@/shared/chat/core/protocol'
import { emitFrame, type SseWriter } from '../chat/stream/stream-wire'
import {
  MASTRA_CHUNK,
  STREAM_ROUTE_TEXT,
  emitFatalStreamError,
  emitStartFrame,
  emitStepStatusFrame,
  emitThinkingFrame,
  emitTokenFrame,
} from '../chat/stream/stream-route-wire'

/** Mastra stream chunk discriminant for the goals loop's per-iteration evaluation. */
const GOAL_CHUNK_TYPE = 'goal'

function createSseWriter(controller: ReadableStreamDefaultController<Uint8Array>): SseWriter {
  const encoder = new TextEncoder()
  let closed = false
  return {
    enqueue: data => {
      if (closed) return false
      try {
        controller.enqueue(encoder.encode(data))
        return true
      } catch {
        closed = true
        return false
      }
    },
    close: () => {
      if (closed) return
      closed = true
      try {
        controller.close()
      } catch {
        /* already closed */
      }
    },
  }
}

/** Surface one goal evaluation as a progress Info frame (iteration / verdict). */
function emitGoalProgress(writer: SseWriter, payload: unknown): void {
  const p = recordFromJson(payload)
  const iteration = readNumber(p.iteration) ?? 0
  const maxRuns = readNumber(p.maxRuns) ?? 0
  const passed = p.passed === true
  const verdict = passed ? 'satisfied' : readString(p.reason) ?? 'continuing'
  emitFrame(writer, {
    type: ChatFrameType.Info,
    message: `Goal ${iteration}/${maxRuns}: ${verdict}`,
  })
}

/** Build the SSE Response for a durable autonomous drafting run. */
export async function streamAutonomousDraftResponse(opts: {
  threadId: string
  resourceId: string
  objective: string
  prompt: string
  traceId: string
}): Promise<Response> {
  const { fullStream, cleanup } = await startAutonomousEpisodeDraft({
    threadId: opts.threadId,
    resourceId: opts.resourceId,
    objective: opts.objective,
    prompt: opts.prompt,
  })

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const writer = createSseWriter(controller)
      // Web ReadableStream isn't async-iterable under this TS lib; read manually.
      const reader = fullStream.getReader()
      try {
        emitStartFrame(writer, opts.traceId)
        for (;;) {
          const { done, value: chunk } = await reader.read()
          if (done) break
          const record = recordFromJson(chunk)
          const payload = recordFromJson(record.payload)
          if (record.type === MASTRA_CHUNK.error) {
            emitFatalStreamError(writer, payload.error)
            return
          } else if (record.type === MASTRA_CHUNK.textDelta) {
            const text = readString(payload.text)
            if (text) emitTokenFrame(writer, text)
          } else if (record.type === MASTRA_CHUNK.reasoningDelta) {
            const thinking = readString(payload.text)
            if (thinking) emitThinkingFrame(writer, thinking)
          } else if (record.type === MASTRA_CHUNK.toolCall || record.type === MASTRA_CHUNK.stepStart) {
            emitStepStatusFrame(writer)
          } else if (record.type === GOAL_CHUNK_TYPE) {
            emitGoalProgress(writer, record.payload)
          }
        }
        emitFrame(writer, { type: ChatFrameType.Complete })
      } catch (error) {
        emitFatalStreamError(writer, error)
      } finally {
        reader.releaseLock()
        cleanup()
        writer.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': STREAM_ROUTE_TEXT.contentTypeEventStream,
      'Cache-Control': STREAM_ROUTE_TEXT.cacheControlNoCache,
      Connection: STREAM_ROUTE_TEXT.connectionKeepAlive,
      'x-trace-id': opts.traceId,
    },
  })
}
