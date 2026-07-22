'use client'

/**
 * assistant-ui chat surface, wired to the Mastra agent bridge. Targets either a
 * module's crew endpoint (`chatApiPath`) or `/api/assistant/<agentId>`. Extra
 * `body` (e.g. projectId) is forwarded to the endpoint on every request.
 */

import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { useChatRuntime, AssistantChatTransport } from '@assistant-ui/react-ai-sdk'
import {
  getCanvasModuleAgentId,
  getCanvasModuleChatApiPath,
  getCanvasModuleSuggestions,
} from '@/shared/canvas/module-registry'
import { AssistantThread } from './AssistantThread'

const DEFAULT_AGENT_ID = 'storyteller'
const ASSISTANT_API_BASE = '/api/assistant/'

interface AssistantChatProps {
  /** Explicit Mastra agent id (reachable via /api/assistant/<agentId>). */
  agentId?: string
  /** Canvas module key — resolves the module's chatApiPath / chatAgentId / suggestions from the registry. */
  moduleKey?: string
  /** Extra request body forwarded to the endpoint (e.g. { projectId }). */
  body?: Record<string, unknown>
  /** Starter prompts; falls back to the module's suggestions. */
  suggestions?: readonly string[]
}

function resolveApi(agentId?: string, moduleKey?: string): string {
  const modulePath = moduleKey ? getCanvasModuleChatApiPath(moduleKey) : undefined
  if (modulePath) return modulePath
  const resolvedAgentId =
    agentId ?? (moduleKey ? getCanvasModuleAgentId(moduleKey) : undefined) ?? DEFAULT_AGENT_ID
  return `${ASSISTANT_API_BASE}${resolvedAgentId}`
}

export function AssistantChat({ agentId, moduleKey, body, suggestions }: AssistantChatProps) {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: resolveApi(agentId, moduleKey), body }),
  })
  const resolvedSuggestions =
    suggestions ?? (moduleKey ? getCanvasModuleSuggestions(moduleKey) : [])

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantThread suggestions={resolvedSuggestions} />
    </AssistantRuntimeProvider>
  )
}
