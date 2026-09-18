import {
  isGenerationActivityBusy,
  type GenerationActivityPhase,
  type PendingChatPromptPayload,
} from '@/domains/storyteller/state/utils/storyteller-ui-store'
import {
  isConsistencyFixRunBusy,
  type ConsistencyFixRunPhase,
} from '@/domains/storyteller/ui/FixInconsistencies/utils/fix-inconsistencies-dialog'

export function isStorytellerWorkspaceBusy(input: {
  generationPhase: GenerationActivityPhase
  pendingChatPrompt: PendingChatPromptPayload | null
  fixPhase?: ConsistencyFixRunPhase
  overlayBusy: boolean
}): boolean {
  return (
    input.overlayBusy ||
    input.pendingChatPrompt !== null ||
    isGenerationActivityBusy(input.generationPhase) ||
    (input.fixPhase !== undefined && isConsistencyFixRunBusy(input.fixPhase))
  )
}
