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
import { HumanMessage, AIMessage, type BaseMessage } from '@langchain/core/messages'
// Side-effect: register the loop-creator Mastra agents on the central instance
// before the first getMastraInstance() call inside streamLoopCreator.
import '@/domains/loop-creator/core/io/mastra-runtime'
import { requireAuth } from '@/shared/auth/auth'
import { verifyProjectAccess } from '@/domains/storyteller/server'
import { streamLoopCreator } from '@/domains/loop-creator/server'
import { createInitialLoopState, type LoopCreatorState } from '@/domains/loop-creator'
import { LoopOrchestratorEventType } from '@/domains/loop-creator/constants/loop-orchestrator'
import { ContentType } from '@/shared/data/constants/protocol'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { isPlainObject, readString } from '@/shared/data/json-guards'

export const maxDuration = 120

const ROLE_USER = 'user'
const ROLE_ASSISTANT = 'assistant'
const PART_TYPE_TEXT = 'text'
const CHUNK_TEXT_START = 'text-start'
const CHUNK_TEXT_DELTA = 'text-delta'
const CHUNK_TEXT_END = 'text-end'
const CHUNK_REASONING_START = 'reasoning-start'
const CHUNK_REASONING_DELTA = 'reasoning-delta'
const CHUNK_REASONING_END = 'reasoning-end'
const TEXT_SEPARATOR = '\n\n'
const ACTIVITY_ARROW = '▸ '
const ACTION_ARROW = '  ↳ '
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
function toBaseMessages(messages: unknown): BaseMessage[] {
  if (!Array.isArray(messages)) return []
  const out: BaseMessage[] = []
  for (const msg of messages) {
    if (!isPlainObject(msg)) continue
    const text = messageText(msg.parts)
    if (!text) continue
    if (msg.role === ROLE_USER) out.push(new HumanMessage(text))
    else if (msg.role === ROLE_ASSISTANT) out.push(new AIMessage(text))
  }
  return out
}

function latestUserText(history: BaseMessage[]): string {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const msg = history[i]
    if (msg instanceof HumanMessage && typeof msg.content === 'string') return msg.content
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

  const body: unknown = await req.json()
  const record = isPlainObject(body) ? body : {}
  const projectId = readString(record.projectId) ?? ''

  if (!(await verifyProjectAccess(projectId, session.user.id))) {
    return jsonError(API_ERROR.PROJECT_ACCESS_DENIED, STATUS_404)
  }

  const history = toBaseMessages(record.messages)
  const message = latestUserText(history)
  const context = isPlainObject(record.context) ? record.context : undefined

  const initialState: LoopCreatorState = {
    ...createInitialLoopState(projectId, message, context),
    // Seed the graph with the full conversation, not just the latest turn.
    messages: history.length > 0 ? history : [new HumanMessage(message)],
  }

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const textId = crypto.randomUUID()
      const reasoningId = crypto.randomUUID()
      writer.write({ type: CHUNK_REASONING_START, id: reasoningId })
      writer.write({ type: CHUNK_TEXT_START, id: textId })

      await streamLoopCreator(
        initialState,
        { configurable: { thread_id: crypto.randomUUID() } },
        event => {
          if (event.type === LoopOrchestratorEventType.Message && event.message?.content) {
            writer.write({
              type: CHUNK_TEXT_DELTA,
              id: textId,
              delta: `${event.message.content}${TEXT_SEPARATOR}`,
            })
            return
          }
          if (event.type === LoopOrchestratorEventType.Node) {
            const label = event.agent ?? event.node
            if (label) {
              writer.write({
                type: CHUNK_REASONING_DELTA,
                id: reasoningId,
                delta: `${ACTIVITY_ARROW}${label}\n`,
              })
            }
            return
          }
          if (event.type === LoopOrchestratorEventType.Action && event.action?.type) {
            writer.write({
              type: CHUNK_REASONING_DELTA,
              id: reasoningId,
              delta: `${ACTION_ARROW}${event.action.type}\n`,
            })
          }
        }
      )

      writer.write({ type: CHUNK_REASONING_END, id: reasoningId })
      writer.write({ type: CHUNK_TEXT_END, id: textId })
    },
  })

  return createUIMessageStreamResponse({ stream })
}
