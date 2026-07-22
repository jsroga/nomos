'use client'

import { Timeline } from '../storyteller-dynamic-imports'
import type { StorytellerPageSlices } from '@/domains/storyteller/state/hooks/useStorytellerPage'

export function StorytellerPageModals(props: StorytellerPageSlices) {
  const { core, phase } = props
  const { currentEpisodeId, beats, setSelectedBeatId, selectedBeatId, pendingQuestions } = core
  const { PhaseBackConfirmDialog } = phase

  return (
    <>
      <Timeline
        episodeId={currentEpisodeId}
        beats={beats.map(beat => ({
          id: beat.id,
          sequence: beat.sequence,
          logline: beat.logline,
          beatType: beat.beatType,
          status: beat.status ?? 'proposed',
        }))}
        onBeatSelect={setSelectedBeatId}
        selectedBeatId={selectedBeatId}
        pendingQuestions={pendingQuestions}
      />

      {PhaseBackConfirmDialog}
    </>
  )
}
