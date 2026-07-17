import { recordError } from '@/shared/observability/observability'
import { parsePhaseId } from '@/domains/storyteller/core/types/enums'
import { isKnownChatModel, resolveChatModelId } from '@/domains/storyteller/config/constants/chat-model-catalog'
import { isStorytellerControllerEnabled } from '@/domains/storyteller/ai/controller/storyteller-controller'
import { BibleSection } from '@/domains/storyteller/core'
import { type DetectedSection } from '@/domains/storyteller/config/tool-result-mapper'
import { assembleStorytellerContext } from '@/domains/storyteller/services/context-assembly-service'
import { createStorytellerAgent } from '@/domains/storyteller/ai'
import { buildStorytellerRequestContext } from '@/domains/storyteller/core/io/mastra-runtime'
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
  projectId?: string
  episodeId?: string
  traceId: string
  agenticMode?: boolean
  currentPhase?: string
  modelName?: string
  userId: string
}

export async function runStorytellerStream(input: StreamRequestInput): Promise<Response> {
  const requestedModel =
    typeof input.modelName === 'string' && input.modelName.trim()
      ? resolveChatModelId(input.modelName)
      : undefined
  if (requestedModel && !isKnownChatModel(requestedModel)) {
    return jsonError(`Unknown model: ${requestedModel}`, 400)
  }

  const { contextPrompt, existingBibleData } = await assembleStorytellerContext({
    projectId: input.projectId,
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
    ? `${contextPrompt}\n${sectionPrompt}\n${agenticInstruction}\nUSER REQUEST:\n${input.message}\n\nRemember: Use projectId="${input.projectId}" for all tool calls that require it.`
    : `${sectionPrompt}\n${agenticInstruction}\n${input.message}`

  const requestContext = buildStorytellerRequestContext({
    projectId: input.projectId,
    episodeId: input.episodeId,
    authorModel: requestedModel,
  })

  if (isStorytellerControllerEnabled()) {
    const { streamStorytellerControllerResponse } = await import('./controller-stream-wire')
    return streamStorytellerControllerResponse({
      prompt: promptWithContext,
      traceId: input.traceId,
      requestContext,
      userId: input.userId,
      projectId: input.projectId,
    })
  }

  const agent = await createStorytellerAgent()
  const result = await agent.stream(promptWithContext, {
    toolChoice: STREAM_ROUTE_TEXT.toolChoiceAuto,
    traceId: input.traceId,
    requestContext,
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
        projectId: input.projectId,
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
