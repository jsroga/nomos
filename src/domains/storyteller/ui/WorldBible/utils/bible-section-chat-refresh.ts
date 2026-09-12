import { lookupPromptBody } from '@/domains/storyteller/ai/prompts/registry/prompt-registry-table'
import type { StorytellerPromptRegistryId } from '@/domains/storyteller/ai/prompts/registry/prompt-registry-ids'
import type { BibleSection } from '@/domains/storyteller/core/types/enums'
import { enqueueStorytellerChatPrompt } from '@/domains/storyteller/state/utils/enqueue-storyteller-chat'
import {
  isGenerationActivityBusy,
  type GenerationActivityPhase,
  type PendingChatPromptPayload,
} from '@/domains/storyteller/state/utils/storyteller-ui-store'

export function requestBibleSectionChatRefresh(input: {
  onSendMessage?: (msg: string, section?: string) => void
  section: BibleSection
  promptId: StorytellerPromptRegistryId
}): boolean {
  const text = lookupPromptBody(input.promptId)
  if (text.length === 0) return false
  return enqueueStorytellerChatPrompt(text, input.section)
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
