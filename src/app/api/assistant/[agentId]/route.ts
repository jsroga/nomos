/**
 * assistant-ui ⇄ Mastra bridge — streams a registered Mastra agent in the
 * AI-SDK UI-message format that the client's `useChat` consumes.
 *
 * POST /api/assistant/<agentId>   body: { messages: UIMessage[] }
 *
 * Must emit text-start / reasoning-start before deltas — without them the
 * client creates an empty assistant bubble and never paints streamed text.
 * Agent.stream is started inside the UI stream execute so the first status
 * chunk can flush before the model connection is ready.
 */

import { RequestContext } from '@mastra/core/di'
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'
import type { UIMessage, InferUIMessageChunk } from 'ai'
import { getMastraInstance } from '@/shared/agent-kernel/mastra-instance'
import { buildStorytellerRequestContext } from '@/domains/storyteller/ai/request-context'
import { StorytellerAgentId } from '@/domains/storyteller/ai/constants/agent-identity'
// Side-effect: register every domain's agents before the first
// getMastraInstance(), so any registered agent id is reachable here.
import '@/domains/storyteller/core/io/mastra-runtime'
import '@/domains/game-design/core/io/mastra-runtime'
import '@/domains/loop-creator/core/io/mastra-runtime'

export const maxDuration = 300

const BODY_MESSAGES_KEY = 'messages'
const INVALID_BODY_MESSAGE = 'Invalid body'
const AGENT_NOT_FOUND_MESSAGE = 'Agent not found'
const STATUS_NOT_FOUND = 404
const STATUS_BAD_REQUEST = 400
const TOOL_CHOICE_AUTO = 'auto'

const CHUNK_TEXT_START = 'text-start'
const CHUNK_TEXT_DELTA = 'text-delta'
const CHUNK_TEXT_END = 'text-end'
const CHUNK_REASONING_START = 'reasoning-start'
const CHUNK_REASONING_DELTA = 'reasoning-delta'
const CHUNK_REASONING_END = 'reasoning-end'
const CHUNK_ERROR = 'error'
const ERROR_TYPE = 'error'

const FULL_STREAM_KEY = 'fullStream'
const TYPE_KEY = 'type'
const TEXT_KEY = 'text'
const DELTA_KEY = 'delta'
const ERROR_TEXT_KEY = 'error'
const TOOL_NAME_KEY = 'toolName'
const TOOL_NAME_FALLBACK_KEY = 'name'
const TOOL_FALLBACK_LABEL = 'tool'

const MASTRA_TEXT = 'text'
const MASTRA_TEXT_DELTA = 'text-delta'
const MASTRA_REASONING = 'reasoning'
const MASTRA_REASONING_DELTA = 'reasoning-delta'
const MASTRA_TOOL_CALL = 'tool-call'
const MASTRA_TOOL_RESULT = 'tool-result'
const MASTRA_ERROR = 'error'
const MASTRA_STEP_START = 'step-start'

const ERROR_MESSAGE_GENERIC = 'Agent stream error'
const ERROR_MESSAGE_STREAM_UNAVAILABLE = 'Agent stream is not available'
const ERROR_MESSAGE_STREAM_FAILED = 'Agent stream failed'
const STATUS_THINKING = 'Thinking…\n'
const STATUS_CONNECTING = 'Connecting…\n'
const STATUS_TOOL_PREFIX = '▸ '
const STATUS_TOOL_DONE_PREFIX = '✓ '
const NEWLINE = '\n'

interface RouteContext {
  params: Promise<{ agentId: string }>
}

interface AssistantChatBody {
  messages: UIMessage[]
  projectId?: string
}

type StreamWriter = {
  write: (chunk: InferUIMessageChunk<UIMessage>) => void
}

type StreamWriters = {
  writeReasoning: (delta: string) => void
  writeText: (delta: string) => void
  textStarted: () => boolean
  reasoningStarted: () => boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return isRecord(value) && typeof Reflect.get(value, Symbol.asyncIterator) === 'function'
}

function isAssistantChatBody(value: unknown): value is AssistantChatBody {
  return (
    isRecord(value) &&
    BODY_MESSAGES_KEY in value &&
    Array.isArray(Reflect.get(value, BODY_MESSAGES_KEY))
  )
}

function buildRequestContext(agentId: string, body: AssistantChatBody): RequestContext | undefined {
  if (agentId === StorytellerAgentId.Storyteller && body.projectId) {
    return buildStorytellerRequestContext({ projectId: body.projectId })
  }
  return undefined
}

function readChunkString(chunk: Record<string, unknown>, key: string): string {
  const value = chunk[key]
  return typeof value === 'string' ? value : ''
}

function readPayloadText(payload: Record<string, unknown>): string {
  return readChunkString(payload, TEXT_KEY) || readChunkString(payload, DELTA_KEY)
}

function readToolName(payload: Record<string, unknown>): string {
  return (
    readChunkString(payload, TOOL_NAME_KEY) ||
    readChunkString(payload, TOOL_NAME_FALLBACK_KEY) ||
    TOOL_FALLBACK_LABEL
  )
}

function toErrorChunk(chunk: Record<string, unknown>): InferUIMessageChunk<UIMessage> {
  const payload = isRecord(chunk.payload) ? chunk.payload : {}
  const error = payload[ERROR_TEXT_KEY] ?? chunk[ERROR_TEXT_KEY]
  const errorText = typeof error === 'string' ? error : ERROR_MESSAGE_GENERIC
  return { type: ERROR_TYPE, errorText } as const
}

function writeStreamError(writer: StreamWriter, error: unknown): void {
  const message = error instanceof Error ? error.message : ERROR_MESSAGE_STREAM_FAILED
  writer.write({ type: ERROR_TYPE, errorText: message } as const)
}

function createStreamWriters(
  writer: StreamWriter,
  textId: string,
  reasoningId: string,
): StreamWriters {
  let reasoningStarted = false
  let textStarted = false

  const ensureReasoning = () => {
    if (reasoningStarted) return
    writer.write({ type: CHUNK_REASONING_START, id: reasoningId } as const)
    reasoningStarted = true
  }

  const ensureText = () => {
    if (textStarted) return
    writer.write({ type: CHUNK_TEXT_START, id: textId } as const)
    textStarted = true
  }

  return {
    writeReasoning: (delta: string) => {
      if (!delta) return
      ensureReasoning()
      writer.write({ type: CHUNK_REASONING_DELTA, id: reasoningId, delta } as const)
    },
    writeText: (delta: string) => {
      if (!delta) return
      ensureText()
      writer.write({ type: CHUNK_TEXT_DELTA, id: textId, delta } as const)
    },
    textStarted: () => textStarted,
    reasoningStarted: () => reasoningStarted,
  }
}

function handleMastraChunk(
  chunk: Record<string, unknown>,
  writer: StreamWriter,
  writers: StreamWriters,
): void {
  const type = readChunkString(chunk, TYPE_KEY)
  const payload = isRecord(chunk.payload) ? chunk.payload : chunk

  if (type === MASTRA_TEXT_DELTA || type === MASTRA_TEXT) {
    writers.writeText(readPayloadText(payload))
    return
  }
  if (type === MASTRA_REASONING_DELTA || type === MASTRA_REASONING) {
    writers.writeReasoning(readPayloadText(payload))
    return
  }
  if (type === MASTRA_TOOL_CALL) {
    writers.writeReasoning(`${STATUS_TOOL_PREFIX}${readToolName(payload)}${NEWLINE}`)
    return
  }
  if (type === MASTRA_TOOL_RESULT) {
    writers.writeReasoning(`${STATUS_TOOL_DONE_PREFIX}${readToolName(payload)}${NEWLINE}`)
    return
  }
  if (type === MASTRA_STEP_START) {
    writers.writeReasoning(STATUS_THINKING)
    return
  }
  if (type === MASTRA_ERROR || type === CHUNK_ERROR) {
    writer.write(toErrorChunk(chunk))
  }
}

function resolveFullStream(result: unknown, writer: StreamWriter): AsyncIterable<unknown> | null {
  if (!isRecord(result) || !(FULL_STREAM_KEY in result)) {
    writer.write({ type: ERROR_TYPE, errorText: ERROR_MESSAGE_STREAM_UNAVAILABLE } as const)
    return null
  }
  const fullStream = result[FULL_STREAM_KEY]
  if (!isAsyncIterable(fullStream)) {
    writer.write({ type: ERROR_TYPE, errorText: ERROR_MESSAGE_STREAM_UNAVAILABLE } as const)
    return null
  }
  return fullStream
}

async function pipeAgentFullStream(
  fullStream: AsyncIterable<unknown>,
  writer: StreamWriter,
  writers: StreamWriters,
  textId: string,
  reasoningId: string,
): Promise<void> {
  writers.writeReasoning(STATUS_THINKING)

  try {
    for await (const chunk of fullStream) {
      if (!isRecord(chunk) || typeof chunk[TYPE_KEY] !== 'string') continue
      handleMastraChunk(chunk, writer, writers)
    }

    if (writers.textStarted()) {
      writer.write({ type: CHUNK_TEXT_END, id: textId } as const)
    }
    if (writers.reasoningStarted()) {
      writer.write({ type: CHUNK_REASONING_END, id: reasoningId } as const)
    }
  } catch (streamError) {
    writeStreamError(writer, streamError)
  }
}

type StreamableAgent = {
  stream: (
    messages: UIMessage[],
    options: { requestContext?: RequestContext; toolChoice: string },
  ) => Promise<unknown>
}

async function executeAssistantStream(args: {
  agent: StreamableAgent
  messages: UIMessage[]
  requestContext: RequestContext | undefined
  writer: StreamWriter
  textId: string
  reasoningId: string
}): Promise<void> {
  const { agent, messages, requestContext, writer, textId, reasoningId } = args
  const writers = createStreamWriters(writer, textId, reasoningId)

  // Flush before awaiting the model so the UI shows status immediately.
  writers.writeReasoning(STATUS_CONNECTING)

  let result: unknown
  try {
    result = await agent.stream(messages, {
      requestContext,
      toolChoice: TOOL_CHOICE_AUTO,
    })
  } catch (streamError) {
    writeStreamError(writer, streamError)
    return
  }

  const fullStream = resolveFullStream(result, writer)
  if (!fullStream) return

  await pipeAgentFullStream(fullStream, writer, writers, textId, reasoningId)
}

export async function POST(req: Request, { params }: RouteContext) {
  const { agentId } = await params
  const raw = await req.json()
  if (!isAssistantChatBody(raw)) {
    return new Response(JSON.stringify({ error: INVALID_BODY_MESSAGE }), { status: STATUS_BAD_REQUEST })
  }

  const requestContext = buildRequestContext(agentId, raw)
  const mastra = getMastraInstance()
  const agent = mastra.getAgentById(agentId)
  if (!agent) {
    return new Response(JSON.stringify({ error: AGENT_NOT_FOUND_MESSAGE }), { status: STATUS_NOT_FOUND })
  }

  const textId = crypto.randomUUID()
  const reasoningId = crypto.randomUUID()
  const messages = raw.messages

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      await executeAssistantStream({
        agent,
        messages,
        requestContext,
        writer,
        textId,
        reasoningId,
      })
    },
  })

  return createUIMessageStreamResponse({ stream })
}
