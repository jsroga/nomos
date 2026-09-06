import { withGatewayContext } from '@/shared/ai/gateway/call-context'
import { E2ePinnedChatModel } from '@/shared/ai/gateway/constants/e2e-llm-pin'
import { isE2eLlmPinned } from '@/shared/ai/gateway/e2e-llm-pin'
import {
  USAGE_COMPLETION_FIELDS,
  USAGE_PROMPT_FIELDS,
} from './constants/stream-usage'
import type { ProjectScope } from '@/shared/auth/project-scope'
import { recordError } from '@/shared/observability/observability'
import { MemorySlot, memoryRef } from '@/shared/agent-kernel/mastra/memory-ref'
import { buildStorytellerRequestContext } from '@/domains/storyteller/core/io/mastra-runtime'
import {
  assembleStorytellerContext,
  BibleSection,
  createStorytellerAgent,
  isKnownChatModel,
  isStorytellerControllerEnabled,
  parsePhaseId,
  resolveChatModelId,
  type DetectedSection,
} from '@/domains/storyteller/server'
import {
  MASTRA_CHUNK,
  STREAM_ROUTE_TEXT,
  STORYTELLER_AGENTIC_MODE_INSTRUCTION,
  emitFatalStreamError,
  emitSectionLoadingStart,
  emitStartFrame,
  emitStepStatusFrame,
  emitThinkingFrame,
  emitTokenFrame,
} from './stream-route-wire'
import {
  handleErrorChunk,
  handleStreamIterationError,
  handleToolCallChunk,
  handleToolResultChunk,
  finalizeStream,
  isRecord,
  type SseWriter,
  type StreamSession,
} from './stream-wire'

interface StreamRequestInput {
  message: string
  scope?: ProjectScope
  episodeId?: string
  traceId: string
  agenticMode?: boolean
  currentPhase?: string
  modelName?: string
  userId: string
}

export async function runStorytellerStream(input: StreamRequestInput): Promise<Response> {
  // Everything downstream — the agent, its tools, the services they reach —
  // bills to this project. Established once here rather than threaded through
  // twenty signatures; see shared/ai/gateway/call-context.ts.
  if (!input.scope) return runStorytellerStreamInner(input)
  return withGatewayContext({ scope: input.scope, traceId: input.traceId }, () =>
    runStorytellerStreamInner(input)
  )
}

async function runStorytellerStreamInner(input: StreamRequestInput): Promise<Response> {
  const requestedModel = isE2eLlmPinned()
    ? E2ePinnedChatModel.CatalogId
    : typeof input.modelName === 'string' && input.modelName.trim()
      ? resolveChatModelId(input.modelName)
      : undefined
  if (requestedModel && !isKnownChatModel(requestedModel)) {
    return jsonError(`Unknown model: ${requestedModel}`, 400)
  }

  const { contextPrompt, existingBibleData } = await assembleStorytellerContext({
    projectId: input.scope?.projectId,
    episodeId: input.episodeId,
    message: input.message,
    currentPhase: parsePhaseId(input.currentPhase),
    userId: input.userId,
    onError: err => {
      console.warn(STREAM_ROUTE_TEXT.logContextAssemblyError, err)
    },
  })

  const detectedSection: DetectedSection = BibleSection.FULL
  const isSectionUpdate = false
  const sectionPrompt = ''
  const agenticInstruction = input.agenticMode ? STORYTELLER_AGENTIC_MODE_INSTRUCTION : ''

  const promptWithContext = contextPrompt
    ? `${contextPrompt}\n${sectionPrompt}\n${agenticInstruction}\nUSER REQUEST:\n${input.message}\n\nRemember: Use projectId="${input.scope?.projectId}" for all tool calls that require it.`
    : `${sectionPrompt}\n${agenticInstruction}\n${input.message}`

  const requestContext = buildStorytellerRequestContext({
    projectId: input.scope?.projectId,
    episodeId: input.episodeId,
    chatModel: requestedModel,
  })

  if (isStorytellerControllerEnabled()) {
    const { streamStorytellerControllerResponse } = await import('./controller-stream-wire')
    return streamStorytellerControllerResponse({
      prompt: promptWithContext,
      traceId: input.traceId,
      requestContext,
      userId: input.userId,
      projectId: input.scope?.projectId,
      episodeId: input.episodeId,
    })
  }

  const agent = await createStorytellerAgent()
  const bound = memoryRef({
    projectId: input.scope?.projectId ?? MemorySlot.None,
    episodeId: input.episodeId,
    userId: input.userId,
  })
  const result = await agent.stream(promptWithContext, {
    toolChoice: STREAM_ROUTE_TEXT.toolChoiceAuto,
    traceId: input.traceId,
    requestContext,
    memory: { thread: bound.thread, resource: bound.resource },
  })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let isStreamClosed = false

      const writer: SseWriter = {
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
        traceId: input.traceId,
        scope: input.scope,
        model: requestedModel ?? resolveChatModelId(),
        episodeId: input.episodeId,
        isSectionUpdate,
        existingBibleData,
        toolCallStartTimes: new Map<string, number>(),
        emittedActionKeys: new Set<string>(),
        pendingActions: [],
        detectedSection,
        fullText: '',
      }

      if (isSectionUpdate) {
        emitSectionLoadingStart(writer, session.detectedSection)
      }

      try {
        emitStartFrame(writer, input.traceId)
        if (isSectionUpdate) {
          emitSectionLoadingStart(writer, session.detectedSection)
        }

        try {
          for await (const chunk of result.fullStream) {
            try {
              await handleStreamChunk(session, chunk)
              if (chunk.type === MASTRA_CHUNK.error) return
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
      'x-trace-id': input.traceId,
    },
  })
}

function handleTextDeltaChunk(session: StreamSession, payload: Record<string, unknown>): void {
  const text = payload.text
  if (typeof text === 'string' && text) {
    session.fullText += text
    emitTokenFrame(session.writer, text)
  }
}

function handleReasoningDeltaChunk(session: StreamSession, payload: Record<string, unknown>): void {
  const thinking = payload.text
  if (typeof thinking === 'string' && thinking) {
    emitThinkingFrame(session.writer, thinking)
  }
}

/**
 * Take the token counts off a finish chunk.
 *
 * Providers disagree on the shape — `usage` sits at the top level or under
 * `payload`, and the fields are `inputTokens`/`promptTokens` depending on
 * version — so this reads defensively and leaves `session.usage` unset when it
 * finds nothing. An unset usage means the call goes unrecorded, which is the
 * intended behaviour: a zero-token row would read as a free generation.
 */
function captureStreamUsage(session: StreamSession, chunk: Record<string, unknown>): void {
  const payload = isRecord(chunk.payload) ? chunk.payload : chunk
  const usage = isRecord(payload.usage) ? payload.usage : undefined
  if (!usage) return

  const promptTokens = readTokenCount(usage, USAGE_PROMPT_FIELDS)
  const completionTokens = readTokenCount(usage, USAGE_COMPLETION_FIELDS)
  if (promptTokens === undefined && completionTokens === undefined) return

  session.usage = {
    promptTokens: promptTokens ?? 0,
    completionTokens: completionTokens ?? 0,
  }
}

function readTokenCount(
  usage: Record<string, unknown>,
  names: readonly string[]
): number | undefined {
  for (const name of names) {
    const value = usage[name]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return undefined
}

async function handleStreamChunk(session: StreamSession, chunk: unknown) {
  if (!isRecord(chunk) || typeof chunk.type !== 'string') {
    return
  }

  const payload = isRecord(chunk.payload) ? chunk.payload : {}

  if (chunk.type === MASTRA_CHUNK.error) {
    handleErrorChunk(session, payload.error)
    return
  }

  if (chunk.type === MASTRA_CHUNK.textDelta) {
    handleTextDeltaChunk(session, payload)
    return
  }

  if (chunk.type === MASTRA_CHUNK.reasoningDelta) {
    handleReasoningDeltaChunk(session, payload)
    return
  }

  if (chunk.type === MASTRA_CHUNK.toolCall) {
    handleToolCallChunk(session, {
      toolName: typeof payload.toolName === 'string' ? payload.toolName : undefined,
      args: payload.args,
    })
    return
  }

  if (chunk.type === MASTRA_CHUNK.toolResult) {
    await handleToolResultChunk(session, {
      toolName: typeof payload.toolName === 'string' ? payload.toolName : undefined,
      result: payload.result,
    })
    return
  }

  if (chunk.type === MASTRA_CHUNK.finish || chunk.type === MASTRA_CHUNK.stepFinish) {
    captureStreamUsage(session, chunk)
    return
  }

  if (chunk.type === MASTRA_CHUNK.stepStart) {
    emitStepStatusFrame(session.writer)
  }
}

export function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': STREAM_ROUTE_TEXT.contentTypeJson },
  })
}

export function recordStreamRouteError(error: unknown): void {
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
}
