'use client'

import { useStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import { isGenerationActivityBusy } from '@/domains/storyteller/state/constants/storyteller-ui-store'
import { isConsistencyFixRunBusy } from '@/domains/storyteller/ui/FixInconsistencies/constants/fix-inconsistencies-dialog'

/** True while Writers Room chat is submitted, streaming, or in a tool call. */
export function useStorytellerChatBusy(): boolean {
  const phase = useStorytellerUiStore(state => state.generationActivity.phase)
  const fixPhase = useStorytellerUiStore(state => state.consistencyFixRun.phase)
  return isGenerationActivityBusy(phase) || isConsistencyFixRunBusy(fixPhase)
}
