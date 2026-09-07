import { lookupPromptBody } from '@/domains/storyteller/ai/prompts/registry/prompt-registry-table'
import type { StorytellerPromptRegistryId } from '@/domains/storyteller/ai/prompts/registry/prompt-registry-ids'
import type { BibleSection } from '@/domains/storyteller/core/types/enums'
import { getStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import {
  isGenerationActivityBusy,
  type GenerationActivityPhase,
  type PendingChatPromptPayload,
} from '@/domains/storyteller/state/constants/storyteller-ui-store'
import { useWorkspaceChatUiStore } from '@/shared/chat/state/workspace-chat-ui-store'

export function requestBibleSectionChatRefresh(input: {
  onSendMessage?: (msg: string, section?: string) => void
  section: BibleSection
  promptId: StorytellerPromptRegistryId
}): boolean {
  const text = lookupPromptBody(input.promptId)
  if (text.length === 0) return false
  useWorkspaceChatUiStore.getState().setOverlayOpen(true)
  if (input.onSendMessage) {
    input.onSendMessage(text, input.section)
    return true
  }
  getStorytellerUiStore().requestChatPrompt(text, input.section)
  return true
}

export function isBibleSectionRefreshDisabled(input: {
  isLoading: boolean
  generationPhase: GenerationActivityPhase
  pendingChatPrompt: PendingChatPromptPayload | null
}): boolean {
  return (
    input.isLoading ||
    input.pendingChatPrompt !== null ||
    isGenerationActivityBusy(input.generationPhase)
  )
}
