'use client'

/**
 * assistant-ui chat surface, wired to the Mastra agent bridge
 * (`/api/assistant/<agentId>`). Drop-in seed for the @/shared/chat migration:
 * point it at any registered agent (default: the storyteller chat adapter).
 */

import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { useChatRuntime, AssistantChatTransport } from '@assistant-ui/react-ai-sdk'
import { getCanvasModuleAgentId } from '@/shared/canvas/module-registry'
import { AssistantThread } from './AssistantThread'

const DEFAULT_AGENT_ID = 'storyteller'
const ASSISTANT_API_BASE = '/api/assistant/'

interface AssistantChatProps {
  /** Explicit Mastra agent id (reachable via /api/assistant/<agentId>). */
  agentId?: string
  /** Canvas module key — resolves to the module's chatAgentId from the registry. */
  moduleKey?: string
}

export function AssistantChat({ agentId, moduleKey }: AssistantChatProps) {
  const resolvedAgentId =
    agentId ?? (moduleKey ? getCanvasModuleAgentId(moduleKey) : undefined) ?? DEFAULT_AGENT_ID

  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: `${ASSISTANT_API_BASE}${resolvedAgentId}` }),
  })

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantThread />
    </AssistantRuntimeProvider>
  )
}
