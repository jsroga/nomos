/**
 * Loop-creator crew ⇄ assistant-ui bridge — runs the full `streamLoopCreator`
 * orchestration (supervisor → specialist crew) and forwards its output to
 * assistant-ui as an AI-SDK UI-message stream.
 *
 * POST body: { messages: UIMessage[], projectId?: string, context?: {…} }
 *
 * - Auth + project access are enforced (mirrors /api/loop-creator/chat).
 * - The whole conversation is hydrated from `messages` (assistant-ui sends the
 *   full turn history), not just the latest user turn.
 * - `context` (canvas nodes/edges + game metadata) seeds the graph when present.
 * - Crew activity (which specialist is working, actions taken) is surfaced on
 *   the reasoning channel; specialist replies go on the text channel.
 */

import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'
import { assistantChatMessage, userChatMessage, ChatMessageRole, type ChatMessage } from '@/shared/chat/core/message'
import '@/domains/loop-creator/core/io/mastra-runtime'
import { requireAuth } from '@/shared/auth/auth'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { streamLoopCreator } from '@/domains/loop-creator/server'
import { createInitialLoopState, type LoopCreatorState } from '@/domains/loop-creator'
import {
  ContentType,
  HttpHeader,
  HttpHeaderName,
  SseAccelBuffering,
  SseCacheControl,
} from '@/shared/data/constants/protocol'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { isPlainObject, readString } from '@/shared/data/json-guards'
import { isE2eHarnessCaller, withE2eLlmPin } from '@/shared/ai/gateway/e2e-llm-pin'
import { AssistantChatBodyKey } from '@/shared/chat/core/utils/assistant-thread-ui'
import { bindOverlaySessionMemory } from '@/shared/chat/core/io/bind-overlay-session-memory'
import { scheduleChatSessionTitle } from '@/shared/chat/core/io/title-chat-session'
import {
  mapLoopStreamEventToReasoningDelta,
  mapLoopStreamEventToTextDelta,
} from '@/domains/loop-creator/core/io/loop-assistant-stream-map'
import { createMastraTraceId } from '@/shared/observability/mastra-trace-id'

export const maxDuration = 300

const ROLE_USER = 'user'
const ROLE_ASSISTANT = 'assistant'
const PART_TYPE_TEXT = 'text'
const CHUNK_TEXT_START = 'text-start'
const CHUNK_TEXT_DELTA = 'text-delta'
const CHUNK_TEXT_END = 'text-end'
const CHUNK_REASONING_START = 'reasoning-start'
const CHUNK_REASONING_DELTA = 'reasoning-delta'
const CHUNK_REASONING_END = 'reasoning-end'
const STATUS_401 = 401
const STATUS_404 = 404

/** Concatenated text of an AI-SDK UI message's text parts. */
function messageText(parts: unknown): string {
  if (!Array.isArray(parts)) return ''
  return parts
    .map(part =>
      isPlainObject(part) && part.type === PART_TYPE_TEXT ? readString(part.text) ?? '' : ''
    )
    .join('')
}

/** Hydrate the full conversation from the AI-SDK UI message history. */
function toChatMessages(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages)) return []
  const out: ChatMessage[] = []
  for (const msg of messages) {
    if (!isPlainObject(msg)) continue
    const text = messageText(msg.parts)
    if (!text) continue
    if (msg.role === ROLE_USER) out.push(userChatMessage(text))
    else if (msg.role === ROLE_ASSISTANT) out.push(assistantChatMessage(text))
  }
  return out
}

function latestUserText(history: ChatMessage[]): string {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const msg = history[i]
    if (msg.role === ChatMessageRole.Human) return msg.content
  }
  return ''
}

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': ContentType.Json },
  })
}

export async function POST(req: Request) {
  const { session } = await requireAuth()
  if (!session) return jsonError(API_ERROR.UNAUTHORIZED, STATUS_401)

  const e2eHarness = isE2eHarnessCaller({
    userId: session.user.id,
    email: session.user.email,
    bypassHeader: req.headers.get(HttpHeader.BYPASS_AUTH),
  })

  const body: unknown = await req.json()
  const record = isPlainObject(body) ? body : {}
  const projectId = readString(record.projectId) ?? ''

  const scope = await tryProjectScope(projectId, session.user.id)
  if (!scope) {
    return jsonError(API_ERROR.PROJECT_ACCESS_DENIED, STATUS_404)
  }

  const history = toChatMessages(record.messages)
  const message = latestUserText(history)
  const context = isPlainObject(record.context) ? record.context : undefined
  const sessionId = readString(record[AssistantChatBodyKey.SessionId])
  let crewThreadId = crypto.randomUUID()
  if (sessionId) {
    const overlayBound = await bindOverlaySessionMemory(sessionId, session.user.id)
    if (!overlayBound) {
      return jsonError(API_ERROR.PROJECT_ACCESS_DENIED, STATUS_404)
    }
    crewThreadId = overlayBound.thread
    scheduleChatSessionTitle({
      sessionId,
      userId: session.user.id,
      scope,
      messages: record.messages,
    })
  }

  const traceId = createMastraTraceId()
  const initialState: LoopCreatorState = {
    ...createInitialLoopState(scope, message, context),
    messages: history.length > 0 ? history : [userChatMessage(message)],
    traceId,
  }

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const turn = async () => {
      const textId = crypto.randomUUID()
      const reasoningId = crypto.randomUUID()
      writer.write({ type: CHUNK_REASONING_START, id: reasoningId })
      writer.write({ type: CHUNK_TEXT_START, id: textId })

      await streamLoopCreator(
        initialState,
        { configurable: { thread_id: crewThreadId } },
        event => {
          const textDelta = mapLoopStreamEventToTextDelta(event)
          if (textDelta) {
            writer.write({
              type: CHUNK_TEXT_DELTA,
              id: textId,
              delta: textDelta,
            })
            return
          }
          const reasoningDelta = mapLoopStreamEventToReasoningDelta(event)
          if (reasoningDelta) {
            writer.write({
              type: CHUNK_REASONING_DELTA,
              id: reasoningId,
              delta: reasoningDelta,
            })
          }
        }
      )

      writer.write({ type: CHUNK_REASONING_END, id: reasoningId })
      writer.write({ type: CHUNK_TEXT_END, id: textId })
      }
      return e2eHarness ? withE2eLlmPin(turn) : turn()
    },
  })

  const uiResponse = createUIMessageStreamResponse({ stream })
  const headers = new Headers(uiResponse.headers)
  headers.set(HttpHeader.TRACE_ID, traceId)
  headers.set(HttpHeader.AccelBuffering, SseAccelBuffering.No)
  headers.set(HttpHeaderName.CacheControl, SseCacheControl.NoCacheNoTransform)
  return new Response(uiResponse.body, { status: uiResponse.status, headers })
}
