/**
 * Flagged controller stream path (PLAN-V2 Phase 4.3).
 *
 * When `STORYTELLER_CONTROLLER=1`, the chat route drives the AgentController
 * session instead of `StorytellerAgent.stream()`. Controller events are mapped
 * (pure `mapControllerEvent`) to frame intents and applied through the SAME
 * `stream-wire` emitters, so read-only conversations emit byte-identical frames
 * to the legacy path. The legacy path is untouched and remains the default.
 *
 * Runtime byte-parity of the mutation/plan path (tool results + plan approval)
 * is the operator acceptance gate (ADR §Verification) — it needs LLM/DB keys, so
 * those intents currently surface as status frames pending that verification.
 */

import type { RequestContext } from '@mastra/core/di'
import { getStorytellerController } from '@/domains/storyteller/core/io/mastra-runtime'
import {
  createControllerStreamContext,
  mapControllerEvent,
  type ControllerFrameIntent,
} from '@/domains/storyteller/ai/controller/controller-sse-wire'
import { ChatFrameType } from '@/shared/chat/core/protocol'
import {
  emitFrame,
  emitStartFrame,
  emitTokenFrame,
  emitThinkingFrame,
  emitStepStatusFrame,
  emitFatalStreamError,
  STREAM_ROUTE_TEXT,
  type SseWriter,
} from './stream-wire'

/** Session tag key scoping threads to a project (ADR §Topology). */
const PROJECT_TAG = 'projectId'
/** Status text for the mutation/plan path whose byte-parity is operator-verified (needs keys). */
const CONTROLLER_TOOL_PENDING = 'Applying changes…'
const CONTROLLER_PLAN_PENDING = 'Awaiting plan approval…'

function applyControllerIntent(writer: SseWriter, intent: ControllerFrameIntent): void {
  switch (intent.kind) {
    case 'token':
      emitTokenFrame(writer, intent.token)
      return
    case 'thinking':
      emitThinkingFrame(writer, intent.thinking)
      return
    case 'status':
      emitStepStatusFrame(writer)
      return
    case 'info':
      emitFrame(writer, { type: ChatFrameType.Info, message: intent.message })
      return
    case 'complete':
      emitFrame(writer, { type: ChatFrameType.Complete })
      return
    case 'error':
      emitFatalStreamError(writer, intent.error)
      return
    case 'toolResult':
      emitFrame(writer, { type: ChatFrameType.Info, message: CONTROLLER_TOOL_PENDING })
      return
    case 'planQuestion':
      emitFrame(writer, { type: ChatFrameType.Info, message: CONTROLLER_PLAN_PENDING })
      return
  }
}

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
        console.warn(STREAM_ROUTE_TEXT.logEnqueueFailed)
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
        console.warn(STREAM_ROUTE_TEXT.logCloseFailed)
      }
    },
  }
}

/** Build the SSE Response backed by an AgentController session. */
export async function streamStorytellerControllerResponse(opts: {
  prompt: string
  traceId: string
  requestContext: RequestContext
  userId: string
  projectId?: string
}): Promise<Response> {
  const controller = await getStorytellerController()
  const session = await controller.createSession({
    resourceId: opts.userId,
    tags: opts.projectId ? { [PROJECT_TAG]: opts.projectId } : undefined,
  })

  const stream = new ReadableStream<Uint8Array>({
    async start(streamController) {
      const writer = createSseWriter(streamController)
      const ctx = createControllerStreamContext()
      const unsubscribe = session.subscribe(event => {
        for (const intent of mapControllerEvent(event, ctx)) {
          applyControllerIntent(writer, intent)
        }
      })
      try {
        emitStartFrame(writer, opts.traceId)
        await session.sendMessage({ content: opts.prompt, requestContext: opts.requestContext })
      } catch (error) {
        emitFatalStreamError(writer, error)
      } finally {
        unsubscribe()
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
