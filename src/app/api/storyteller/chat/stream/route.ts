// NOTE: import from specific server-side submodules rather than the
// `@/domains/storyteller` barrel — that barrel also re-exports client UI
// components (e.g. CorkBoard), which pulls client-only hooks into this
// server Route Handler's build graph and breaks compilation.
import { createStorytellerAgent } from '@/domains/storyteller/ai'
import { normalizeMastraTraceId } from '@/domains/storyteller/ai/tracing'
import {
  buildStorytellerRequestContext,
} from '@/domains/storyteller/core/io/mastra-runtime'
import { isKnownChatModel, resolveChatModelId } from '@/domains/storyteller/config/constants/chat-model-catalog'
import { BibleSection } from '@/domains/storyteller/core'
import { type DetectedSection } from '@/domains/storyteller/config/tool-result-mapper'
import { assembleStorytellerContext } from '@/domains/storyteller/services/context-assembly-service'
import { recordError } from '@/shared/observability/observability'
import {
  MASTRA_CHUNK,
  STREAM_ROUTE_TEXT,
  emitFatalStreamError,
  emitSectionLoadingStart,
  emitStartFrame,
  emitStepStatusFrame,
  emitThinkingFrame,
  emitTokenFrame,
  finalizeStream,
  handleErrorChunk,
  handleStreamIterationError,
  handleToolCallChunk,
  handleToolResultChunk,
  type SseWriter,
  type StreamSession,
} from './stream-wire'

// Node.js Runtime required for Mastra core dependencies
// eslint-disable-next-line local/no-magic-string -- Next.js segment config must be a statically analyzable literal (user-approved exception, 2026-07-09)
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    // Security: Require authentication
    const { requireAuth } = await import('@/shared/auth/auth')
    const { verifyProjectAccess, verifyEpisodeAccess } = await import(
      '@/domains/storyteller/services/access-verification-service'
    )

    const { session } = await requireAuth()
    if (!session) {
      return new Response(JSON.stringify({ error: STREAM_ROUTE_TEXT.errUnauthorized }), {
        status: 401,
        headers: { 'Content-Type': STREAM_ROUTE_TEXT.contentTypeJson },
      })
    }

    // Parse body parameters
    // Request contract unchanged: `sessionId` and `userId` remain accepted
    // body params (the legacy workflow-context consumer is gone).
    const {
      message,
      projectId,
      episodeId,
      traceId: bodyTraceId,
      agenticMode,
      currentPhase,
      modelName,
    } = await req.json()

    // Security: Validate required parameters
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: STREAM_ROUTE_TEXT.errInvalidMessage }), {
        status: 400,
        headers: { 'Content-Type': STREAM_ROUTE_TEXT.contentTypeJson },
      })
    }

    // The picker choice drives the AUTHOR inside the beat pipeline (D2), not
    // the chat glue agent (fixed 'chat' role slot). Only an explicit client
    // choice becomes a RequestContext override — when absent, the role-matrix
    // author default applies. Explicitly unknown ids are rejected to avoid
    // silently hitting an unconfigured provider.
    const requestedModel =
      typeof modelName === 'string' && modelName.trim() ? resolveChatModelId(modelName) : undefined
    if (requestedModel && !isKnownChatModel(requestedModel)) {
      return new Response(
        JSON.stringify({ error: `Unknown model: ${requestedModel}` }),
        { status: 400, headers: { 'Content-Type': STREAM_ROUTE_TEXT.contentTypeJson } }
      )
    }

    // Security: Limit message length to prevent abuse
    if (message.length > 10000) {
      return new Response(JSON.stringify({ error: STREAM_ROUTE_TEXT.errMessageTooLong }), {
        status: 400,
        headers: { 'Content-Type': STREAM_ROUTE_TEXT.contentTypeJson },
      })
    }

    // Security: Verify project access
    if (projectId && !(await verifyProjectAccess(projectId, session.user.id))) {
      return new Response(JSON.stringify({ error: STREAM_ROUTE_TEXT.errProjectAccess }), {
        status: 403,
        headers: { 'Content-Type': STREAM_ROUTE_TEXT.contentTypeJson },
      })
    }

    // Security: Verify episode access
    if (episodeId && !(await verifyEpisodeAccess(episodeId, session.user.id))) {
      return new Response(JSON.stringify({ error: STREAM_ROUTE_TEXT.errEpisodeAccess }), {
        status: 403,
        headers: { 'Content-Type': STREAM_ROUTE_TEXT.contentTypeJson },
      })
    }

    const traceId = normalizeMastraTraceId(
      req.headers.get(STREAM_ROUTE_TEXT.traceIdHeader) || bodyTraceId
    )

    // 1. Fetch + format FULL context
    const { contextPrompt, existingBibleData } = await assembleStorytellerContext({
      projectId,
      episodeId,
      message,
      currentPhase,
      userId: session.user.id,
      onError: err => {
        console.warn(STREAM_ROUTE_TEXT.logContextAssemblyError, err)
      },
    })

    const agent = await createStorytellerAgent()

    // No pattern matching - LLM decides what to update via tool calls.
    // Section is extracted from the tool result, not pre-detected.
    const detectedSection: DetectedSection = BibleSection.FULL
    const isSectionUpdate = false // Will be determined by tool call
    const sectionPrompt = '' // No forced section mode

    // Prepend context and AGENTIC INSTRUCTION
    let agenticInstruction = ''

    if (agenticMode) {
      // The writers'-room council is gone; agentic mode now means "prefer the
      // full GRRM pipeline over ad-hoc chat drafting".
      agenticInstruction = `
### AGENTIC MODE
For any request to write, draft, or generate a story beat or scene, call 'run_beat_draft_workflow' rather than drafting in chat.
`
    }

    const promptWithContext = contextPrompt
      ? `${contextPrompt}\n${sectionPrompt}\n${agenticInstruction}\nUSER REQUEST:\n${message}\n\nRemember: Use projectId="${projectId}" for all tool calls that require it.`
      : `${sectionPrompt}\n${agenticInstruction}\n${message}`

    // existingBibleData (for diff "before" state) comes from assembleStorytellerContext above.

    // Server-trusted per-request values: tools prefer these over model-supplied
    // args (IDs), and the author's model resolver reads the picker choice.
    const requestContext = buildStorytellerRequestContext({
      projectId,
      episodeId,
      authorModel: requestedModel,
    })

    // toolChoice 'auto' — 'required' causes infinite loops; the prompt already
    // instructs when to use tools. (The previous untyped options bag also
    // carried telemetry/memory fields the agent wrapper never forwarded.)
    const result = await agent.stream(promptWithContext, {
      toolChoice: STREAM_ROUTE_TEXT.toolChoiceAuto,
      traceId,
      requestContext,
    })

    // Create SSE stream that useChatStream can parse. Frame vocabulary and
    // chunk handling live in ./stream-wire — frames stay byte-identical.
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        // Track if controller is closed to prevent "Controller is already closed" errors
        let isStreamClosed = false

        const writer: SseWriter = {
          // Safe enqueue that checks if the stream is still open
          enqueue: data => {
            if (isStreamClosed) return false
            try {
              controller.enqueue(encoder.encode(data))
              return true
            } catch (_e) {
              console.warn(STREAM_ROUTE_TEXT.logEnqueueFailed)
              isStreamClosed = true
              return false
            }
          },
          // Safe close (idempotent)
          close: () => {
            if (isStreamClosed) return
            isStreamClosed = true
            try {
              controller.close()
            } catch (_e) {
              console.warn(STREAM_ROUTE_TEXT.logCloseFailed)
            }
          },
        }

        const session: StreamSession = {
          writer,
          traceId,
          projectId,
          episodeId,
          isSectionUpdate,
          existingBibleData,
          toolCallStartTimes: new Map<string, number>(),
          // Dedupe emitted actions (same tool + same section = skip)
          emittedActionKeys: new Set<string>(),
          // Actions collected to emit AFTER the final message (better UX)
          pendingActions: [],
          detectedSection,
          fullText: '',
        }

        // IMMEDIATELY emit section_loading if this is a section update
        if (isSectionUpdate) {
          emitSectionLoadingStart(writer, session.detectedSection)
        }

        // (The legacy writers'-room event-bus bridge lived here. Its only
        // emitter was the deleted StoryWorkflow, so those frames never fired;
        // the beat-draft verdict now flows through the tool-result handler.)

        try {
          emitStartFrame(writer, traceId)

          if (isSectionUpdate) {
            emitSectionLoadingStart(writer, session.detectedSection)
          }

          try {
            for await (const chunk of result.fullStream) {
              try {
                if (chunk.type === MASTRA_CHUNK.error) {
                  handleErrorChunk(session, chunk.payload.error)
                  return
                }

                if (chunk.type === MASTRA_CHUNK.textDelta) {
                  const text = chunk.payload.text
                  if (text) {
                    session.fullText += text
                    emitTokenFrame(writer, text)
                  }
                } else if (chunk.type === MASTRA_CHUNK.reasoningDelta) {
                  const thinking = chunk.payload.text
                  if (thinking) {
                    emitThinkingFrame(writer, thinking)
                  }
                } else if (chunk.type === MASTRA_CHUNK.toolCall) {
                  handleToolCallChunk(session, chunk.payload)
                } else if (chunk.type === MASTRA_CHUNK.toolResult) {
                  await handleToolResultChunk(session, chunk.payload)
                } else if (chunk.type === MASTRA_CHUNK.stepStart) {
                  emitStepStatusFrame(writer)
                }
              } catch (chunkError) {
                console.warn(STREAM_ROUTE_TEXT.logChunkError, chunkError)
              }
            }
          } catch (streamIterationError: unknown) {
            handleStreamIterationError(session, streamIterationError)
            return
          }

          await finalizeStream(session)
        } catch (error) {
          emitFatalStreamError(writer, error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': STREAM_ROUTE_TEXT.contentTypeEventStream,
        'Cache-Control': STREAM_ROUTE_TEXT.cacheControlNoCache,
        Connection: STREAM_ROUTE_TEXT.connectionKeepAlive,
        'x-trace-id': traceId,
      },
    })
  } catch (error) {
    console.error(STREAM_ROUTE_TEXT.logStreamingError, error)

    // Record error with categorization
    const errorTraceId = `error-${Date.now()}`
    try {
      recordError(errorTraceId, error instanceof Error ? error : new Error(String(error)), {
        category: STREAM_ROUTE_TEXT.errorCategorySystem,
        agentName: STREAM_ROUTE_TEXT.agentStoryteller,
        recoverable: false,
      })
    } catch {
      /* ignore */
    }

    return new Response(JSON.stringify({ error: STREAM_ROUTE_TEXT.errStreamingFailed }), {
      status: 500,
      headers: { 'Content-Type': STREAM_ROUTE_TEXT.contentTypeJson },
    })
  }
}
