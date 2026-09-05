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

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
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
import { ChatRenderersProvider, type ChatRenderers } from '@/shared/chat/core/renderers'
import type { MentionProvider, ProjectContext } from '@/shared/chat/core/mentions/types'
import {
  AssistantChatBodyKey,
  ChatMessageRole,
  ChatPartType,
  type AssistantChatModelOption,
} from '@/shared/chat/core/constants/assistant-thread-ui'
import { isPlainObject } from '@/shared/data/json-guards'
import { AssistantThread } from './AssistantThread'
import { AskUserToolUI } from './AssistantHumanTool'
import { useAssistantMentions } from './useAssistantMentions'
import { AssistantAddToWorldProvider, type AddToWorldPayload, type CanAddToWorldInput } from './AssistantAddToWorldContext'
import {
  AssistantGenerationLabel,
  AssistantGenerationPhase,
  type AssistantGenerationActivity,
} from './derive-assistant-generation-activity'
import {
  extractCompletedAssistantToolCalls,
  type AssistantCompletedToolCall,
} from './extract-completed-assistant-tool-calls'
import { AssistantPendingPromptBridge } from './AssistantPendingPromptBridge'
import { useAssistantTurnSettle } from './use-assistant-turn-settle'
import type { AssistantPendingPrompt } from './use-assistant-pending-prompt'

export type { AssistantPendingPrompt } from './use-assistant-pending-prompt'

const DEFAULT_AGENT_ID = 'storyteller'
const ASSISTANT_API_BASE = '/api/assistant/'
const EMPTY_PROVIDERS: readonly MentionProvider[] = []
const EMPTY_PROJECT_CONTEXT: ProjectContext = { projectId: '' }

enum WarmHttpMethod {
  Get = 'GET',
}

function lastUserTextFromMessages(
  messages: Parameters<typeof extractCompletedAssistantToolCalls>[0],
): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message?.role !== ChatMessageRole.User) continue
    const chunks: string[] = []
    for (const part of message.parts) {
      if (part.type !== ChatPartType.Text) continue
      const text = Reflect.get(part, ChatPartType.Text)
      if (typeof text === 'string' && text.trim()) chunks.push(text)
    }
    if (chunks.length > 0) return chunks.join('\n')
  }
  return ''
}

function emitFreshCompletedTools(
  messages: Parameters<typeof extractCompletedAssistantToolCalls>[0],
  proposedToolKeys: Set<string>,
  onCompleted:
    | ((calls: readonly AssistantCompletedToolCall[], userText: string) => void)
    | undefined,
) {
  const completed = extractCompletedAssistantToolCalls(messages)
  if (completed.length === 0 || !onCompleted) return
  const fresh = completed.filter(call => {
    const key = `${call.toolName}:${JSON.stringify(call.args).slice(0, 160)}`
    if (proposedToolKeys.has(key)) return false
    proposedToolKeys.add(key)
    return true
  })
  if (fresh.length > 0) onCompleted(fresh, lastUserTextFromMessages(messages))
}


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
  /** External inject (e.g. bible section refresh) — sent once per id. */
  pendingPrompt?: AssistantPendingPrompt | null
  onPendingPromptHandled?: (id: number) => void
  /** Fires when the chat leaves a streaming/submitted state. */
  onStreamIdle?: () => void
  /** Live tool/stream progress for host overlays (bible section refresh, etc.). */
  onGenerationActivity?: (activity: AssistantGenerationActivity) => void
  /** Completed tool calls from the latest assistant turn (bible board sync, etc.). */
  onCompletedToolCalls?: (
    calls: readonly AssistantCompletedToolCall[],
    userText?: string,
  ) => void
  /** Chat “Add to world” — host commits tool payloads, never assistant wrap-up copy. */
  onAddToWorld?: (payload: AddToWorldPayload) => boolean | Promise<boolean>
  /** Labels for bible sections this message’s tool args would commit. */
  sectionLabelsFromToolArgs?: (toolArgs: readonly Record<string, unknown>[]) => string[]
  /** True after Accept / reject leaves nothing for this message to commit. */
  isAddToWorldSettled?: (toolArgs: readonly Record<string, unknown>[]) => boolean
  /** When set, Add to World is hidden unless this returns true. */
  canAddToWorld?: (input: CanAddToWorldInput) => boolean
  /** Domain-injected markdown/chip renderers (Writers Room entity links). */
  chatRenderers?: ChatRenderers
  /** Domain tool UIs registered beside AskUser (storyteller verdict card). */
  extraToolUIs?: ReactNode
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
  pendingPrompt,
  onPendingPromptHandled,
  onStreamIdle,
  onGenerationActivity,
  onCompletedToolCalls,
  onAddToWorld,
  sectionLabelsFromToolArgs,
  isAddToWorldSettled,
  canAddToWorld,
  chatRenderers,
  extraToolUIs,
}: AssistantChatProps) {
  const history = useMemo(
    () => (persistKey ? createSessionThreadHistoryAdapter(persistKey) : undefined),
    [persistKey]
  )
  const api = resolveApi(agentId, moduleKey)
  const resolvedAgentId =
    agentId ?? (moduleKey ? getCanvasModuleAgentId(moduleKey) : undefined) ?? DEFAULT_AGENT_ID
  const chatBody = useMemo(() => {
    const base = isPlainObject(body) ? body : {}
    if (!chatModelId) return base
    return { ...base, [AssistantChatBodyKey.ModelName]: chatModelId }
  }, [body, chatModelId])

  // A fresh transport per body change is safe: useChat reads the latest
  // transport at send time and only recreates the Chat when `id` changes.
  const transport = useMemo(
    () => new DefaultChatTransport({ api, body: chatBody }),
    [api, chatBody]
  )
  const chat = useChat({ transport, experimental_throttle: 50 })
  const adapters = useMemo(() => (history ? { history } : undefined), [history])
  const runtime = useAISDKRuntime(chat, { adapters })
  const wasBusy = useRef(false)
  const stuckTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const proposedToolKeys = useRef(new Set<string>())
  const lastActivityFingerprint = useRef<string>('')
  const onStreamIdleRef = useRef(onStreamIdle)
  const onGenerationActivityRef = useRef(onGenerationActivity)
  const onPendingPromptHandledRef = useRef(onPendingPromptHandled)
  const onCompletedToolCallsRef = useRef(onCompletedToolCalls)
  const sendMessageRef = useRef(chat.sendMessage)
  const stopRef = useRef(chat.stop)
  const statusRef = useRef(chat.status)
  const messagesRef = useRef<Parameters<typeof extractCompletedAssistantToolCalls>[0]>(
    chat.messages,
  )
  const errorRef = useRef(chat.error)

  useEffect(() => {
    onStreamIdleRef.current = onStreamIdle
  }, [onStreamIdle])

  useEffect(() => {
    onGenerationActivityRef.current = onGenerationActivity
  }, [onGenerationActivity])

  useEffect(() => {
    onPendingPromptHandledRef.current = onPendingPromptHandled
  }, [onPendingPromptHandled])

  useEffect(() => {
    onCompletedToolCallsRef.current = onCompletedToolCalls
  }, [onCompletedToolCalls])

  useEffect(() => {
    sendMessageRef.current = chat.sendMessage
    stopRef.current = chat.stop
    statusRef.current = chat.status
    messagesRef.current = chat.messages
    errorRef.current = chat.error
  }, [chat.sendMessage, chat.stop, chat.status, chat.messages, chat.error])

  const clearStuckTimer = useCallback(() => {
    if (!stuckTimer.current) return
    clearTimeout(stuckTimer.current)
    stuckTimer.current = null
  }, [])

  const clearSettleTimer = useCallback(() => {
    if (!settleTimer.current) return
    clearTimeout(settleTimer.current)
    settleTimer.current = null
  }, [])

  const finishGeneration = useCallback((opts?: { error?: string }) => {
    clearStuckTimer()
    clearSettleTimer()
    lastActivityFingerprint.current = ''
    if (opts?.error) {
      onGenerationActivityRef.current?.({
        phase: AssistantGenerationPhase.Error,
        label: AssistantGenerationLabel.Error,
        error: opts.error,
        agentId: resolvedAgentId,
      })
    } else {
      onGenerationActivityRef.current?.({
        phase: AssistantGenerationPhase.Idle,
        label: '',
        agentId: resolvedAgentId,
      })
    }
    onStreamIdleRef.current?.()
  }, [clearStuckTimer, clearSettleTimer, resolvedAgentId])

  const emitFreshTools = useCallback(
    (messages: Parameters<typeof extractCompletedAssistantToolCalls>[0]) => {
      emitFreshCompletedTools(
        messages,
        proposedToolKeys.current,
        onCompletedToolCallsRef.current,
      )
    },
    [],
  )

  useAssistantTurnSettle({
    status: chat.status,
    error: chat.error,
    resolvedAgentId,
    wasBusy,
    settleTimer,
    lastActivityFingerprint,
    statusRef,
    messagesRef,
    errorRef,
    onGenerationActivityRef,
    finishGeneration,
    clearSettleTimer,
    emitFreshTools,
  })

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        await fetch(api, {
          method: WarmHttpMethod.Get,
          signal: controller.signal,
        })
      } catch {
      }
    })()
    return () => controller.abort()
  }, [api])

  useEffect(
    () => () => {
      clearStuckTimer()
      clearSettleTimer()
    },
    [clearStuckTimer, clearSettleTimer]
  )

  const resolvedSuggestions =
    suggestions ?? (moduleKey ? getCanvasModuleSuggestions(moduleKey) : [])

  const chatBodyUi = (
    <AssistantAddToWorldProvider
      onAddToWorld={onAddToWorld}
      sectionLabelsFromToolArgs={sectionLabelsFromToolArgs}
      isAddToWorldSettled={isAddToWorldSettled}
      canAddToWorld={canAddToWorld}
    >
      <AskUserToolUI />
      {extraToolUIs}
      <AssistantChatBody
        suggestions={resolvedSuggestions}
        mentionProviders={mentionProviders}
        mentionProjectContext={mentionProjectContext}
        chatModelId={chatModelId}
        chatModelOptions={chatModelOptions}
        onChatModelChange={onChatModelChange}
      />
    </AssistantAddToWorldProvider>
  )

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantPendingPromptBridge
        pendingPrompt={pendingPrompt}
        onHandled={onPendingPromptHandled}
      />
      {chatRenderers ? (
        <ChatRenderersProvider renderers={chatRenderers}>{chatBodyUi}</ChatRenderersProvider>
      ) : (
        chatBodyUi
      )}
    </AssistantRuntimeProvider>
  )
}
