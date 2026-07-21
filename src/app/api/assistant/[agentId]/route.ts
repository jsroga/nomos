/**
 * assistant-ui ⇄ Mastra bridge — streams a registered Mastra agent in the
 * AI-SDK UI-message format that assistant-ui's `useChatRuntime` consumes.
 *
 * POST /api/assistant/<agentId>   body: { messages: UIMessage[] }
 *
 * Foundation for the @/shared/chat → assistant-ui migration (see
 * ASSISTANT-UI-MIGRATION-PLAN.md). Custom features (mentions, citations, agent
 * logs, HITL) come in later phases.
 */

import { handleChatStream } from '@mastra/ai-sdk'
import { createUIMessageStreamResponse } from 'ai'
import { getMastraInstance } from '@/shared/agent-kernel/mastra-instance'
// Side-effect: ensure the storyteller agents (chat adapter + critics) are
// registered before the first getMastraInstance().
import '@/domains/storyteller/core/io/mastra-runtime'

export const maxDuration = 30

const CHAT_STREAM_VERSION = 'v6'

interface RouteContext {
  params: Promise<{ agentId: string }>
}

export async function POST(req: Request, { params }: RouteContext) {
  const { agentId } = await params
  const { messages } = await req.json()

  const stream = await handleChatStream({
    mastra: getMastraInstance(),
    agentId,
    version: CHAT_STREAM_VERSION,
    params: { messages },
  })

  return createUIMessageStreamResponse({ stream })
}
