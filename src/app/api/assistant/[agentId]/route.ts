/**
 * assistant-ui ⇄ Mastra bridge — streams a registered Mastra agent in the
 * AI-SDK UI-message format that the client's `useChat` consumes.
 *
 * POST /api/assistant/<agentId>   body: { messages: UIMessage[] }
 *
 * Uses `@mastra/ai-sdk` `handleChatStream` so start / finish / tool parts match
 * what `useChat` expects — without `finish`, the composer stays on Stop.
 */

import { RequestContext } from '@mastra/core/di'
import { handleChatStream } from '@mastra/ai-sdk'
import { createUIMessageStreamResponse } from 'ai'
import type { UIMessage } from 'ai'
import { getMastraInstance } from '@/shared/agent-kernel/mastra-instance'
import { buildStorytellerRequestContext } from '@/domains/storyteller/ai/request-context'
import { StorytellerAgentId } from '@/domains/storyteller/ai/constants/agent-identity'
import {
  isKnownChatModel,
  resolveChatModelId,
} from '@/domains/storyteller/config/constants/chat-model-catalog'
import { AssistantChatBodyKey } from '@/shared/chat/core/constants/assistant-thread-ui'
// Side-effect: register every domain's agents before the first
// getMastraInstance(), so any registered agent id is reachable here.
import '@/domains/storyteller/core/io/mastra-runtime'
import '@/domains/game-design/core/io/mastra-runtime'
import '@/domains/loop-creator/core/io/mastra-runtime'

export const maxDuration = 300

const INVALID_BODY_MESSAGE = 'Invalid body'
const AGENT_NOT_FOUND_MESSAGE = 'Agent not found'
const UNKNOWN_MODEL_PREFIX = 'Unknown model: '
const STATUS_NOT_FOUND = 404
const STATUS_BAD_REQUEST = 400
const TOOL_CHOICE_AUTO = 'auto'

enum AiSdkUiMessageVersion {
  V6 = 'v6',
}

interface RouteContext {
  params: Promise<{ agentId: string }>
}

interface AssistantChatBody {
  messages: UIMessage[]
  projectId?: string
  modelName?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAssistantChatBody(value: unknown): value is AssistantChatBody {
  return (
    isRecord(value) &&
    AssistantChatBodyKey.Messages in value &&
    Array.isArray(Reflect.get(value, AssistantChatBodyKey.Messages))
  )
}

function buildRequestContext(agentId: string, body: AssistantChatBody): RequestContext | undefined {
  if (agentId !== StorytellerAgentId.Storyteller) return undefined

  const rawModel = body[AssistantChatBodyKey.ModelName]
  const authorModel =
    typeof rawModel === 'string' && rawModel.trim()
      ? resolveChatModelId(rawModel)
      : undefined

  if (authorModel && !isKnownChatModel(authorModel)) {
    return undefined
  }

  const projectId = body[AssistantChatBodyKey.ProjectId]
  if (!projectId && !authorModel) return undefined

  return buildStorytellerRequestContext({
    projectId,
    authorModel,
  })
}

function readModelNameError(body: AssistantChatBody): string | null {
  const rawModel = body[AssistantChatBodyKey.ModelName]
  if (typeof rawModel !== 'string' || !rawModel.trim()) return null
  const resolved = resolveChatModelId(rawModel)
  if (!isKnownChatModel(resolved)) return `${UNKNOWN_MODEL_PREFIX}${resolved}`
  return null
}

export async function POST(req: Request, { params }: RouteContext) {
  const { agentId } = await params
  const raw = await req.json()
  if (!isAssistantChatBody(raw)) {
    return new Response(JSON.stringify({ error: INVALID_BODY_MESSAGE }), { status: STATUS_BAD_REQUEST })
  }

  const modelError = readModelNameError(raw)
  if (modelError) {
    return new Response(JSON.stringify({ error: modelError }), { status: STATUS_BAD_REQUEST })
  }

  const requestContext = buildRequestContext(agentId, raw)
  const mastra = getMastraInstance()
  if (!mastra.getAgentById(agentId)) {
    return new Response(JSON.stringify({ error: AGENT_NOT_FOUND_MESSAGE }), { status: STATUS_NOT_FOUND })
  }

  const stream = await handleChatStream({
    mastra,
    agentId,
    version: AiSdkUiMessageVersion.V6,
    params: {
      messages: raw.messages,
      requestContext,
      toolChoice: TOOL_CHOICE_AUTO,
    },
    sendStart: true,
    sendFinish: true,
    sendReasoning: false,
  })

  return createUIMessageStreamResponse({ stream })
}
