'use client'

import { create } from 'zustand'
import type { AddToWorldPayload, CanAddToWorldInput } from '@/shared/chat/assistant/AssistantAddToWorldContext'
import type { AssistantGenerationActivity } from '@/shared/chat/assistant/derive-assistant-generation-activity'
import type { AssistantCompletedToolCall } from '@/shared/chat/assistant/extract-completed-assistant-tool-calls'
import type { AssistantPendingPrompt } from '@/shared/chat/assistant/AssistantChat'
import type { AssistantChatModelOption } from '@/shared/chat/core/constants/assistant-thread-ui'
import type { MentionProvider, ProjectContext } from '@/shared/chat/core/mentions/types'
import type { ChatRenderers } from '@/shared/chat/core/renderers'
import type { ReactNode } from 'react'

export type WritersRoomOverlayBridge = {
  body: Record<string, string>
  suggestions: readonly string[]
  mentionProviders: readonly MentionProvider[]
  mentionProjectContext: ProjectContext
  modelId?: string
  chatModelOptions?: readonly AssistantChatModelOption[]
  onChatModelChange?: (modelId: string) => void
  pendingPrompt: AssistantPendingPrompt | null
  onPendingPromptHandled: () => void
  onStreamIdle: () => void
  onGenerationActivity: (activity: AssistantGenerationActivity) => void
  onCompletedToolCalls: (
    calls: readonly AssistantCompletedToolCall[],
    userText?: string,
  ) => void
  onAddToWorld: (payload: AddToWorldPayload) => boolean | Promise<boolean>
  sectionLabelsFromToolArgs: (toolArgs: readonly Record<string, unknown>[]) => string[]
  isAddToWorldSettled: (toolArgs: readonly Record<string, unknown>[]) => boolean
  canAddToWorld: (input: CanAddToWorldInput) => boolean
  chatRenderers?: ChatRenderers
  extraToolUIs?: ReactNode
}

interface BridgeState {
  bridge: WritersRoomOverlayBridge | null
  setBridge: (bridge: WritersRoomOverlayBridge | null) => void
}

export const useWritersRoomOverlayBridge = create<BridgeState>(set => ({
  bridge: null,
  setBridge: bridge => set({ bridge }),
}))
