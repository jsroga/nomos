import type { ComponentType, ReactNode } from 'react'
import { AppModuleId } from '@/shared/data/constants/protocol'
import type { ChatSession } from '@/shared/chat/core/io/chat-session-contract'
import type { AssistantPendingPrompt } from '@/shared/chat/assistant/AssistantChat'
import type { MentionProvider, ProjectContext } from '@/shared/chat/core/mentions/types'
import type { AssistantChatModelOption } from '@/shared/chat/core/constants/assistant-thread-ui'
import type { ChatRenderers } from '@/shared/chat/core/renderers'
import type {
  AddToWorldPayload,
  CanAddToWorldInput,
} from '@/shared/chat/assistant/AssistantAddToWorldContext'
import type { AssistantGenerationActivity } from '@/shared/chat/assistant/derive-assistant-generation-activity'
import type { AssistantCompletedToolCall } from '@/shared/chat/assistant/extract-completed-assistant-tool-calls'

export type OverlaySessionHostProps = {
  session: ChatSession
  projectId: string
  hidden: boolean
  composerEnabled: boolean
  onBeforeSend: (text: string) => boolean
  onChatStatus: (status: string) => void
  stopHandlers: Map<string, () => void>
}

export type OverlayChatBindings = {
  agentId?: string
  moduleKey?: string
  body?: Record<string, unknown>
  suggestions?: readonly string[]
  mentionProviders?: readonly MentionProvider[]
  mentionProjectContext?: ProjectContext
  chatModelId?: string
  chatModelOptions?: readonly AssistantChatModelOption[]
  onChatModelChange?: (modelId: string) => void
  pendingPrompt?: AssistantPendingPrompt | null
  onPendingPromptHandled?: (id: number) => void
  onStreamIdle?: () => void
  onGenerationActivity?: (activity: AssistantGenerationActivity) => void
  onCompletedToolCalls?: (
    calls: readonly AssistantCompletedToolCall[],
    userText?: string,
  ) => void
  onAddToWorld?: (payload: AddToWorldPayload) => boolean | Promise<boolean>
  sectionLabelsFromToolArgs?: (toolArgs: readonly Record<string, unknown>[]) => string[]
  isAddToWorldSettled?: (toolArgs: readonly Record<string, unknown>[]) => boolean
  canAddToWorld?: (input: CanAddToWorldInput) => boolean
  chatRenderers?: ChatRenderers
  extraToolUIs?: ReactNode
  tourStepId?: string
}

export type ModuleChatAdapter = {
  composerEnabled: boolean
  agentId?: string
  moduleKey?: string
  SessionHost?: ComponentType<OverlaySessionHostProps>
}

export function getDefaultChatAdapter(moduleId: AppModuleId): ModuleChatAdapter {
  switch (moduleId) {
    case AppModuleId.Storyteller:
      return { composerEnabled: true, agentId: AppModuleId.Storyteller }
    case AppModuleId.LoopCreator:
      return { composerEnabled: true, moduleKey: AppModuleId.LoopCreator }
    case AppModuleId.WorldBuilding:
    case AppModuleId.InteriorDesigner:
    case AppModuleId.AssetExporter:
      return { composerEnabled: false }
    default:
      return { composerEnabled: false }
  }
}
