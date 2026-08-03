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

import { useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { useAISDKRuntime } from '@assistant-ui/react-ai-sdk'
import { DefaultChatTransport } from 'ai'
import { createSessionThreadHistoryAdapter } from './thread-history-adapter'
import {
  getCanvasModuleAgentId,
  getCanvasModuleChatApiPath,
  getCanvasModuleSuggestions,
} from '@/shared/canvas/module-registry'
import type { MentionProvider, ProjectContext } from '@/shared/chat/core/mentions/types'
import {
  AssistantChatBodyKey,
  type AssistantChatModelOption,
} from '@/shared/chat/core/constants/assistant-thread-ui'
import { isPlainObject } from '@/shared/data/json-guards'
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
  /** Selected chat model id (Writers Room picker). */
  chatModelId?: string
  /** Models offered in the composer dropdown. */
  chatModelOptions?: readonly AssistantChatModelOption[]
  /** Persist / update the selected chat model. */
  onChatModelChange?: (modelId: string) => void
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
  chatModelId,
  chatModelOptions,
  onChatModelChange,
}: {
  suggestions: readonly string[]
  mentionProviders?: readonly MentionProvider[]
  mentionProjectContext?: ProjectContext
  chatModelId?: string
  chatModelOptions?: readonly AssistantChatModelOption[]
  onChatModelChange?: (modelId: string) => void
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
      chatModelId={chatModelId}
      chatModelOptions={chatModelOptions}
      onChatModelChange={onChatModelChange}
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
  chatModelId,
  chatModelOptions,
  onChatModelChange,
}: AssistantChatProps) {
  const history = useMemo(
    () => (persistKey ? createSessionThreadHistoryAdapter(persistKey) : undefined),
    [persistKey]
  )
  const api = resolveApi(agentId, moduleKey)
  const chatBody = useMemo(() => {
    const base = isPlainObject(body) ? body : {}
    if (!chatModelId) return base
    return { ...base, [AssistantChatBodyKey.ModelName]: chatModelId }
  }, [body, chatModelId])

  const transport = useMemo(
    () => new DefaultChatTransport({ api, body: chatBody }),
    [api, chatBody],
  )
  const chat = useChat({ transport })
  const adapters = useMemo(() => (history ? { history } : undefined), [history])
  const runtime = useAISDKRuntime(chat, { adapters })

  const resolvedSuggestions =
    suggestions ?? (moduleKey ? getCanvasModuleSuggestions(moduleKey) : [])

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AskUserToolUI />
      <AssistantChatBody
        suggestions={resolvedSuggestions}
        mentionProviders={mentionProviders}
        mentionProjectContext={mentionProjectContext}
        chatModelId={chatModelId}
        chatModelOptions={chatModelOptions}
        onChatModelChange={onChatModelChange}
      />
    </AssistantRuntimeProvider>
  )
}
