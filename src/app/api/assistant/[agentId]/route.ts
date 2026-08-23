/**
 * assistant-ui ⇄ Mastra bridge — streams a registered Mastra agent in the
 * AI-SDK UI-message format that the client's `useChat` consumes.
 *
 * POST /api/assistant/<agentId>   body: { messages: UIMessage[] }
 *
 * Uses `@mastra/ai-sdk` `handleChatStream` so start / finish / tool parts match
 * what `useChat` expects — without `finish`, the composer stays on Stop.
 *
 * Domain registration imports are static so agents exist before the first
 * getMastraInstance() in this route (ordering contract).
 */

import '@/domains/storyteller/core/io/mastra-runtime'
import '@/domains/game-design/core/io/mastra-runtime'
import '@/domains/loop-creator/core/io/mastra-runtime'

import { RequestContext } from '@mastra/core/di'
import { handleChatStream } from '@mastra/ai-sdk'
import { createUIMessageStream, createUIMessageStreamResponse, generateId } from 'ai'
import type { UIMessage } from 'ai'
import { getMastraInstance, warmMastraStorage } from '@/shared/agent-kernel/mastra-instance'
import { withStreamTiming } from '@/shared/chat/assistant/assistant-stream-timing'
import { buildStorytellerRequestContext } from '@/domains/storyteller/ai/request-context'
import { StorytellerAgentId } from '@/domains/storyteller/ai/constants/agent-identity'
import {
  isKnownChatModel,
  resolveChatModelId,
} from '@/domains/storyteller/config/constants/chat-model-catalog'
import { AssistantChatBodyKey } from '@/shared/chat/core/constants/assistant-thread-ui'
import { ChatMessageRole, ChatPartType } from '@/shared/chat/core/constants/assistant-thread-ui'
import { requireAuth } from '@/shared/auth/auth'
import { ApiErrorMessage } from '@/shared/data/constants/protocol'
import { requestedEpisodePremiseField } from '@/domains/storyteller/core/utils/requested-episode-premise-field'
import { CharacterDraftChatSection } from '@/domains/storyteller/core/storyteller-page-wire'
import { readString } from '@/shared/data/json-guards'
import {
  BEAT_TOOL_ID,
  LIST_BEATS_TOOL_ID,
  CHARACTER_TOOL_ID,
  LIST_CHARACTERS_TOOL_ID,
  EPISODE_TOOL_ID,
  LIST_EPISODES_TOOL_ID,
  UPDATE_WORLD_BIBLE_TOOL_ID,
  READ_WORLD_BIBLE_TOOL_ID,
  CHECK_CONTINUITY_TOOL_ID,
  CHECK_SECTION_ALIGNMENT_TOOL_ID,
  PROPOSE_CHARACTER_FIELDS_TOOL_ID,
} from '@/domains/storyteller/ai/tools/manage-tools-wire'
import { RUN_BEAT_DRAFT_WORKFLOW_TOOL_ID } from '@/domains/storyteller/ai/workflows/beat-draft-contract'

/** Storyteller chat tools only — excludes inherited Mastra workspace FS tools. */
const STORYTELLER_CHAT_ACTIVE_TOOLS = [
  BEAT_TOOL_ID,
  LIST_BEATS_TOOL_ID,
  CHARACTER_TOOL_ID,
  LIST_CHARACTERS_TOOL_ID,
  EPISODE_TOOL_ID,
  LIST_EPISODES_TOOL_ID,
  UPDATE_WORLD_BIBLE_TOOL_ID,
  READ_WORLD_BIBLE_TOOL_ID,
  CHECK_CONTINUITY_TOOL_ID,
  CHECK_SECTION_ALIGNMENT_TOOL_ID,
  PROPOSE_CHARACTER_FIELDS_TOOL_ID,
  RUN_BEAT_DRAFT_WORKFLOW_TOOL_ID,
] as const

export const maxDuration = 300

const INVALID_BODY_MESSAGE = 'Invalid body'
const AGENT_NOT_FOUND_MESSAGE = 'Agent not found'
const UNKNOWN_MODEL_PREFIX = 'Unknown model: '
const PROJECT_ACCESS_DENIED = 'Project access denied'
const EPISODE_ACCESS_DENIED = 'Episode access denied'
const STATUS_NOT_FOUND = 404
const STATUS_BAD_REQUEST = 400
const STATUS_FORBIDDEN = 403
const STATUS_UNAUTHORIZED = 401
const TOOL_CHOICE_AUTO = 'auto'

enum AiSdkUiMessageVersion {
  V6 = 'v6',
}

enum UiMessageStreamChunkType {
  Start = 'start',
}

enum AssistantTurnLog {
  ContextReady = '[Stream] World context ready in ',
  StreamError = '[Stream] agent stream error after ',
  Model = '[Stream] chat model=',
}


enum ChatModelSource {
  Picker = 'picker',
  EnvDefault = 'env/default',
}

/** Empty override — live LLM scorers must not hold the SSE open after the model turn. */
const CHAT_ROUTE_SCORERS = {} as const

enum StorytellerOpenWorkspaceCopy {
  Header = '=== OPEN WORKSPACE (authoritative — do not invent or scrape IDs from the repo) ===',
  ProjectIdMissing = 'projectId: (missing)',
  ProjectIdLabel = 'projectId',
  EpisodeIdLabel = 'episodeId',
  NoWorkspaceTools =
    'Use ONLY these IDs for tool calls. Never call workspace filesystem tools (list/grep/read repo files).',
  GenerateViaTool =
    'For GENERATE / REGENERATE world description or bible sections: call update_world_bible immediately with these IDs — do not browse the codebase.',
  CharacterDraftViaTool =
    'This turn fills an unsaved character create/edit form. Call propose_character_fields only. Never call update_world_bible. Never call manage_character. Do not write worldDescription or any bible section.',
  EpisodeDescriptionOnly =
    'Latest user request is episode description (logline) only. Write episodePremise: { logline }. Do not fill other Ozymandias fields.',
  RememberProjectIdMid = 'Remember: Use projectId=',
  RememberProjectIdEnd = ' for all tool calls that require it.',
}

function quotedIdLine(label: string, id: string): string {
  return `${label}: ${JSON.stringify(id)}`
}

interface RouteContext {
  params: Promise<{ agentId: string }>
}

interface AssistantChatBody {
  messages: UIMessage[]
  projectId?: string
  episodeId?: string
  modelName?: string
  bibleSection?: string
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

function latestUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message?.role !== ChatMessageRole.User) continue
    const chunks: string[] = []
    for (const part of message.parts) {
      if (part.type !== ChatPartType.Text) continue
      const text = Reflect.get(part, ChatPartType.Text)
      if (typeof text === 'string' && text.trim()) chunks.push(text)
    }
    if (chunks.length > 0) return chunks.join('\n')
  }
  return ''
}

function buildRequestContext(agentId: string, body: AssistantChatBody): RequestContext | undefined {
  if (agentId !== StorytellerAgentId.Storyteller) return undefined

  const rawModel = body[AssistantChatBodyKey.ModelName]
  const chatModel =
    typeof rawModel === 'string' && rawModel.trim()
      ? resolveChatModelId(rawModel)
      : undefined

  if (chatModel && !isKnownChatModel(chatModel)) {
    return undefined
  }

  const projectId = body[AssistantChatBodyKey.ProjectId]
  const episodeId = body[AssistantChatBodyKey.EpisodeId]
  const bibleSection = body[AssistantChatBodyKey.BibleSection]
  if (!projectId && !episodeId && !chatModel && !bibleSection) return undefined

  return buildStorytellerRequestContext({
    projectId,
    episodeId,
    chatModel,
    bibleSection,
    premiseField: requestedEpisodePremiseField(latestUserText(body.messages)),
  })
}

function readModelNameError(body: AssistantChatBody): string | null {
  const rawModel = body[AssistantChatBodyKey.ModelName]
  if (typeof rawModel !== 'string' || !rawModel.trim()) return null
  const resolved = resolveChatModelId(rawModel)
  if (!isKnownChatModel(resolved)) return `${UNKNOWN_MODEL_PREFIX}${resolved}`
  return null
}

function storytellerChatActiveTools(bibleSection?: string): string[] {
  if (bibleSection !== CharacterDraftChatSection.Form) {
    return [...STORYTELLER_CHAT_ACTIVE_TOOLS]
  }
  return STORYTELLER_CHAT_ACTIVE_TOOLS.filter(tool => tool !== UPDATE_WORLD_BIBLE_TOOL_ID)
}

function buildStorytellerSystemContext(opts: {
  contextPrompt: string
  projectId?: string
  episodeId?: string
  userMessage?: string
  bibleSection?: string
}): string {
  const projectId = readString(opts.projectId) ?? ''
  const episodeId = readString(opts.episodeId)
  const lines = [
    opts.contextPrompt,
    '',
    StorytellerOpenWorkspaceCopy.Header,
    projectId
      ? quotedIdLine(StorytellerOpenWorkspaceCopy.ProjectIdLabel, projectId)
      : StorytellerOpenWorkspaceCopy.ProjectIdMissing,
  ]
  if (episodeId) {
    lines.push(quotedIdLine(StorytellerOpenWorkspaceCopy.EpisodeIdLabel, episodeId))
  }
  lines.push(
    StorytellerOpenWorkspaceCopy.NoWorkspaceTools,
    opts.bibleSection === CharacterDraftChatSection.Form
      ? StorytellerOpenWorkspaceCopy.CharacterDraftViaTool
      : StorytellerOpenWorkspaceCopy.GenerateViaTool,
  )
  if (requestedEpisodePremiseField(opts.userMessage ?? '')) {
    lines.push(StorytellerOpenWorkspaceCopy.EpisodeDescriptionOnly)
  }
  if (projectId) {
    lines.push(
      `${StorytellerOpenWorkspaceCopy.RememberProjectIdMid}${JSON.stringify(projectId)}${StorytellerOpenWorkspaceCopy.RememberProjectIdEnd}`
    )
  }
  return lines.filter(Boolean).join('\n')
}

async function resolveStorytellerSystem(opts: {
  agentId: string
  projectId?: string
  episodeId?: string
  messages: UIMessage[]
  userId: string
  bibleSection?: string
}): Promise<string | undefined> {
  if (opts.agentId !== StorytellerAgentId.Storyteller || !opts.projectId) return undefined
  const { assembleStorytellerContext } = await import(
    '@/domains/storyteller/services/context-assembly-service'
  )
  const userMessage = latestUserText(opts.messages)
  const { contextPrompt } = await assembleStorytellerContext({
    projectId: opts.projectId,
    episodeId: opts.episodeId,
    message: userMessage || ' ',
    userId: opts.userId,
  })
  return buildStorytellerSystemContext({
    contextPrompt,
    projectId: opts.projectId,
    episodeId: opts.episodeId,
    userMessage,
    bibleSection: opts.bibleSection,
  })
}

export async function POST(req: Request, { params }: RouteContext) {
  const { session, error: authError } = await requireAuth()
  if (authError || !session?.user?.id) {
    return new Response(JSON.stringify({ error: ApiErrorMessage.UNAUTHORIZED }), {
      status: STATUS_UNAUTHORIZED,
    })
  }

  const { agentId } = await params
  const raw = await req.json()
  if (!isAssistantChatBody(raw)) {
    return new Response(JSON.stringify({ error: INVALID_BODY_MESSAGE }), { status: STATUS_BAD_REQUEST })
  }

  const modelError = readModelNameError(raw)
  if (modelError) {
    return new Response(JSON.stringify({ error: modelError }), { status: STATUS_BAD_REQUEST })
  }

  const projectId = raw[AssistantChatBodyKey.ProjectId]
  const episodeId = raw[AssistantChatBodyKey.EpisodeId]
  const userId = session.user.id

  const { verifyProjectAccess, verifyEpisodeAccess } = await import(
    '@/domains/storyteller/services/access-verification-service'
  )

  if (projectId && !(await verifyProjectAccess(projectId, userId))) {
    return new Response(JSON.stringify({ error: PROJECT_ACCESS_DENIED }), { status: STATUS_FORBIDDEN })
  }
  if (episodeId && !(await verifyEpisodeAccess(episodeId, userId))) {
    return new Response(JSON.stringify({ error: EPISODE_ACCESS_DENIED }), { status: STATUS_FORBIDDEN })
  }

  const requestContext = buildRequestContext(agentId, raw)
  const mastra = getMastraInstance()
  if (!mastra.getAgentById(agentId)) {
    return new Response(JSON.stringify({ error: AGENT_NOT_FOUND_MESSAGE }), { status: STATUS_NOT_FOUND })
  }

  const isStoryteller = agentId === StorytellerAgentId.Storyteller

  // Return the SSE response immediately; assemble context inside the stream so
  // the client leaves "submitted" while world context loads (not hung).
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // A start chunk only flips useChat off "submitted" when it carries a
      // messageId; the agent stream therefore runs with sendStart: false so
      // exactly one start frame (this one) owns the assistant message id.
      writer.write({ type: UiMessageStreamChunkType.Start, messageId: generateId() })

      const turnStartedAt = Date.now()
      const bibleSection = raw[AssistantChatBodyKey.BibleSection]
      if (isStoryteller) {
        const picked = raw[AssistantChatBodyKey.ModelName]
        const source =
          typeof picked === 'string' && picked.trim()
            ? ChatModelSource.Picker
            : ChatModelSource.EnvDefault
        console.log(`${AssistantTurnLog.Model}${resolveChatModelId(picked)} (${source})`)
      }
      try {
        const system = await resolveStorytellerSystem({
          agentId,
          projectId,
          episodeId,
          messages: raw.messages,
          userId,
          bibleSection,
        })
        console.log(`${AssistantTurnLog.ContextReady}${Date.now() - turnStartedAt}ms`)
        const agentStream = await handleChatStream({
          mastra,
          agentId,
          version: AiSdkUiMessageVersion.V6,
          params: {
            messages: raw.messages,
            requestContext,
            toolChoice: TOOL_CHOICE_AUTO,
            // Override agent live scorers — goalReached LLM judges were holding
            // the SSE open ~30s after first chunk with nothing for the UI.
            scorers: CHAT_ROUTE_SCORERS,
            ...(system ? { system } : {}),
            ...(isStoryteller ? { activeTools: storytellerChatActiveTools(bibleSection) } : {}),
          },
          sendStart: false,
          sendFinish: true,
          // Reasoning models spend most of a turn thinking (measured: 60-98% of
          // output tokens, ~57s before the first tool frame). Suppressing it
          // left the thread with nothing to render for that whole window.
          sendReasoning: true,
        })
        writer.merge(withStreamTiming(agentStream, turnStartedAt))
      } catch (error) {
        console.error(
          `${AssistantTurnLog.StreamError}${Date.now() - turnStartedAt}ms`,
          error
        )
        throw error
      }
    },
  })

  return createUIMessageStreamResponse({ stream })
}

/** Warm the route chunk + Mastra registration without starting a chat turn. */
export async function GET(_req: Request, { params }: RouteContext) {
  const { agentId } = await params
  const mastra = getMastraInstance()
  if (!mastra.getAgentById(agentId)) {
    return new Response(JSON.stringify({ error: AGENT_NOT_FOUND_MESSAGE }), { status: STATUS_NOT_FOUND })
  }
  // Not awaited: schema setup is ~30s cold and would otherwise be paid by the
  // user's first turn. Returning now lets the composer mount immediately.
  void warmMastraStorage()
  return Response.json({ ok: true, agentId })
}
