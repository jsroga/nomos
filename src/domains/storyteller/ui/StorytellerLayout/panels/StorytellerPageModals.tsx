'use client'

import type { StorytellerPageSlices } from '@/domains/storyteller/state/hooks/useStorytellerPage'

export function StorytellerPageModals(props: StorytellerPageSlices) {
  const { PhaseBackConfirmDialog } = props.phase

  return <>{PhaseBackConfirmDialog}</>
}
