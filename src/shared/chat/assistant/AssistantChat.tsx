'use client'

/**
 * assistant-ui chat surface, wired to the Mastra agent bridge. Targets either a
 * module's crew endpoint (`chatApiPath`) or `/api/assistant/<agentId>`. Extra
 * `body` (e.g. projectId) is forwarded to the endpoint on every request.
 */

import { useMemo } from 'react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { useChatRuntime, AssistantChatTransport } from '@assistant-ui/react-ai-sdk'
import { createSessionThreadHistoryAdapter } from './thread-history-adapter'
import {
  getCanvasModuleAgentId,
  getCanvasModuleChatApiPath,
  getCanvasModuleSuggestions,
} from '@/shared/canvas/module-registry'
import type { MentionProvider, ProjectContext } from '@/shared/chat/core/mentions/types'
import { AssistantThread } from './AssistantThread'
import { AskUserToolUI } from './AssistantHumanTool'
import { useAssistantMentions } from './useAssistantMentions'

const DEFAULT_AGENT_ID = 'storyteller'
const ASSISTANT_API_BASE = '/api/assistant/'
const EMPTY_PROVIDERS: readonly MentionProvider[] = []
const EMPTY_PROJECT_CONTEXT: ProjectContext = { projectId: '' }

interface AssistantChatProps {
  /** Explicit Mastra agent id (reachable via /api/assistant/<agentId>). */
  agentId?: string
  /** Canvas module key — resolves the module's chatApiPath / chatAgentId / suggestions from the registry. */
  moduleKey?: string
  /** Extra request body forwarded to the endpoint (e.g. { projectId }). */
  body?: Record<string, unknown>
  /** Starter prompts; falls back to the module's suggestions. */
  suggestions?: readonly string[]
  /** `@`-mention providers; when present, the mention popover is enabled. */
  mentionProviders?: readonly MentionProvider[]
  /** Project context passed to mention providers. */
  mentionProjectContext?: ProjectContext
  /** When set, the thread is persisted (sessionStorage) under this key across reloads. */
  persistKey?: string
}

function resolveApi(agentId?: string, moduleKey?: string): string {
  const modulePath = moduleKey ? getCanvasModuleChatApiPath(moduleKey) : undefined
  if (modulePath) return modulePath
  const resolvedAgentId =
    agentId ?? (moduleKey ? getCanvasModuleAgentId(moduleKey) : undefined) ?? DEFAULT_AGENT_ID
  return `${ASSISTANT_API_BASE}${resolvedAgentId}`
}

export function AssistantChat({
  agentId,
  moduleKey,
  body,
  suggestions,
  mentionProviders,
  mentionProjectContext,
  persistKey,
}: AssistantChatProps) {
  const history = useMemo(
    () => (persistKey ? createSessionThreadHistoryAdapter(persistKey) : undefined),
    [persistKey]
  )
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: resolveApi(agentId, moduleKey), body }),
    adapters: history ? { history } : undefined,
  })
  const resolvedSuggestions =
    suggestions ?? (moduleKey ? getCanvasModuleSuggestions(moduleKey) : [])

  const mentions = useAssistantMentions(
    mentionProviders ?? EMPTY_PROVIDERS,
    mentionProjectContext ?? EMPTY_PROJECT_CONTEXT
  )
  const mentionsEnabled = (mentionProviders?.length ?? 0) > 0

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AskUserToolUI />
      <AssistantThread
        suggestions={resolvedSuggestions}
        mentions={mentionsEnabled ? mentions : undefined}
      />
    </AssistantRuntimeProvider>
  )
}
