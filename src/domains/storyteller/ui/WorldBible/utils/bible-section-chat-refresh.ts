import { lookupPromptBody } from '@/domains/storyteller/ai/prompts/registry/prompt-registry-table'
import type { StorytellerPromptRegistryId } from '@/domains/storyteller/ai/prompts/registry/prompt-registry-ids'
import type { BibleSection } from '@/domains/storyteller/core/types/enums'
import { enqueueStorytellerChatPrompt } from '@/domains/storyteller/state/utils/enqueue-storyteller-chat'
import { getStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import { isStorytellerWorkspaceBusy } from '@/domains/storyteller/state/utils/storyteller-chat-busy'
import type {
  GenerationActivityPhase,
  PendingChatPromptPayload,
} from '@/domains/storyteller/state/utils/storyteller-ui-store'
import type { ConsistencyFixRunPhase } from '@/domains/storyteller/ui/FixInconsistencies/utils/fix-inconsistencies-dialog'
import { isAnyWorkspaceChatRuntimeBusy } from '@/shared/chat/ui/WorkspaceChatOverlay/workspace-chat-session-helpers'
import { useWorkspaceChatUiStore } from '@/shared/chat/state/workspace-chat-ui-store'

export function requestBibleSectionChatRefresh(input: {
  onSendMessage?: (msg: string, section?: string) => void
  section: BibleSection
  promptId: StorytellerPromptRegistryId
}): boolean {
  const store = getStorytellerUiStore()
  if (
    isBibleSectionRefreshDisabled({
      isLoading: false,
      generationPhase: store.generationActivity.phase,
      pendingChatPrompt: store.pendingChatPrompt,
      fixPhase: store.consistencyFixRun.phase,
      overlayBusy: isAnyWorkspaceChatRuntimeBusy(
        useWorkspaceChatUiStore.getState().localRuntimeStatus,
      ),
    })
  ) {
    return false
  }
  const text = lookupPromptBody(input.promptId)
  if (text.length === 0) return false
  return enqueueStorytellerChatPrompt(text, input.section)
}

export function isBibleSectionRefreshDisabled(input: {
  isLoading: boolean
  generationPhase: GenerationActivityPhase
  pendingChatPrompt: PendingChatPromptPayload | null
  fixPhase?: ConsistencyFixRunPhase
  overlayBusy?: boolean
}): boolean {
  return (
    input.isLoading ||
    isStorytellerWorkspaceBusy({
      generationPhase: input.generationPhase,
      pendingChatPrompt: input.pendingChatPrompt,
      fixPhase: input.fixPhase,
      overlayBusy: input.overlayBusy ?? false,
    })
  )
}
