'use client'

/**
 * assistant-ui chat surface, wired to the Mastra agent bridge
 * (`/api/assistant/<agentId>`). Drop-in seed for the @/shared/chat migration:
 * point it at any registered agent (default: the storyteller chat adapter).
 */

import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { useChatRuntime, AssistantChatTransport } from '@assistant-ui/react-ai-sdk'
import { AssistantThread } from './AssistantThread'

const DEFAULT_AGENT_ID = 'storyteller'
const ASSISTANT_API_BASE = '/api/assistant/'

export function AssistantChat({ agentId = DEFAULT_AGENT_ID }: { agentId?: string }) {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: `${ASSISTANT_API_BASE}${agentId}` }),
  })

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantThread />
    </AssistantRuntimeProvider>
  )
}
