/**
 * Loop-creator crew ⇄ assistant-ui bridge — runs the full `streamLoopCreator`
 * orchestration (supervisor → specialist crew) and forwards its assistant
 * messages to assistant-ui as an AI-SDK UI-message stream.
 *
 * POST body: { messages: UIMessage[], projectId?: string }
 *
 * Tracked gaps (ASSISTANT-UI-SWAP-TRACKER.md): the crew starts from the latest
 * user turn only (no DB hydration of existing loops/context yet), and non-text
 * events (agent activity, sections, actions) aren't mapped to tool/data parts.
 */

import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'
import { HumanMessage } from '@langchain/core/messages'
import { streamLoopCreator } from '@/domains/loop-creator/server'
import { createInitialLoopState, type LoopCreatorState } from '@/domains/loop-creator'
import { LoopOrchestratorEventType } from '@/domains/loop-creator/constants/loop-orchestrator'
import { isPlainObject, readString } from '@/shared/data/json-guards'

export const maxDuration = 60

const ROLE_USER = 'user'
const PART_TYPE_TEXT = 'text'
const CHUNK_TEXT_START = 'text-start'
const CHUNK_TEXT_DELTA = 'text-delta'
const CHUNK_TEXT_END = 'text-end'
const TEXT_SEPARATOR = '\n\n'

/** Text of the latest user turn from AI-SDK UI messages (parts[].text). */
function lastUserText(messages: unknown): string {
  if (!Array.isArray(messages)) return ''
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i]
    if (!isPlainObject(msg) || msg.role !== ROLE_USER || !Array.isArray(msg.parts)) continue
    const text = msg.parts
      .map(part =>
        isPlainObject(part) && part.type === PART_TYPE_TEXT ? readString(part.text) ?? '' : ''
      )
      .join('')
    if (text) return text
  }
  return ''
}

export async function POST(req: Request) {
  const body: unknown = await req.json()
  const record = isPlainObject(body) ? body : {}
  const projectId = readString(record.projectId) ?? ''
  const message = lastUserText(record.messages)

  const initialState: LoopCreatorState = {
    ...createInitialLoopState(projectId, message),
    messages: [new HumanMessage(message)],
  }

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const id = crypto.randomUUID()
      writer.write({ type: CHUNK_TEXT_START, id })
      await streamLoopCreator(
        initialState,
        { configurable: { thread_id: crypto.randomUUID() } },
        event => {
          if (event.type === LoopOrchestratorEventType.Message && event.message?.content) {
            writer.write({
              type: CHUNK_TEXT_DELTA,
              id,
              delta: `${event.message.content}${TEXT_SEPARATOR}`,
            })
          }
        }
      )
      writer.write({ type: CHUNK_TEXT_END, id })
    },
  })

  return createUIMessageStreamResponse({ stream })
}
