'use client'

/**
 * assistant-ui chat surface, wired to the Mastra agent bridge. Targets either a
 * module's crew endpoint (`chatApiPath`) or `/api/assistant/<agentId>`. Extra
 * `body` (e.g. projectId) is forwarded to the endpoint on every request.
 *
 * Uses `useChat` + `useAISDKRuntime` (not `useChatRuntime`) because
 * `useRemoteThreadListRuntime` inside `useChatRuntime` early-returns with a
 * different hook count when nesting/context flickers — that crashes React with
 * "Rendered fewer hooks than expected".
 */

import { useEffect, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { useAISDKRuntime, AssistantChatTransport } from '@assistant-ui/react-ai-sdk'
import { createSessionThreadHistoryAdapter } from './thread-history-adapter'
import {
  getCanvasModuleAgentId,
  getCanvasModuleChatApiPath,
  getCanvasModuleSuggestions,
} from '@/shared/canvas/module-registry'
import type { MentionProvider, ProjectContext } from '@/shared/chat/core/mentions/types'
import { isPlainObject } from '@/shared/data/json-guards'
import { AssistantThread } from './AssistantThread'
import { AskUserToolUI } from './AssistantHumanTool'
import { useAssistantMentions } from './useAssistantMentions'

const DEFAULT_AGENT_ID = 'storyteller'
const ASSISTANT_API_BASE = '/api/assistant/'
const EMPTY_PROVIDERS: readonly MentionProvider[] = []
const EMPTY_PROJECT_CONTEXT: ProjectContext = { projectId: '' }
const JSON_NULL = 'null'

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

function AssistantChatBody({
  suggestions,
  mentionProviders,
  mentionProjectContext,
}: {
  suggestions: readonly string[]
  mentionProviders?: readonly MentionProvider[]
  mentionProjectContext?: ProjectContext
}) {
  const mentions = useAssistantMentions(
    mentionProviders ?? EMPTY_PROVIDERS,
    mentionProjectContext ?? EMPTY_PROJECT_CONTEXT
  )
  const mentionsEnabled = (mentionProviders?.length ?? 0) > 0

  return (
    <AssistantThread
      suggestions={suggestions}
      mentions={mentionsEnabled ? mentions : undefined}
    />
  )
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
  const api = resolveApi(agentId, moduleKey)
  const bodyKey = JSON.stringify(body ?? null)
  const transport = useMemo(() => {
    if (bodyKey === JSON_NULL) return new AssistantChatTransport({ api })
    const parsed: unknown = JSON.parse(bodyKey)
    return new AssistantChatTransport({
      api,
      body: isPlainObject(parsed) ? parsed : undefined,
    })
  }, [api, bodyKey])
  const chat = useChat({ transport })
  const adapters = useMemo(() => (history ? { history } : undefined), [history])
  const runtime = useAISDKRuntime(chat, { adapters })

  useEffect(() => {
    transport.setRuntime(runtime)
  }, [transport, runtime])

  const resolvedSuggestions =
    suggestions ?? (moduleKey ? getCanvasModuleSuggestions(moduleKey) : [])

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AskUserToolUI />
      <AssistantChatBody
        suggestions={resolvedSuggestions}
        mentionProviders={mentionProviders}
        mentionProjectContext={mentionProjectContext}
      />
    </AssistantRuntimeProvider>
  )
}
