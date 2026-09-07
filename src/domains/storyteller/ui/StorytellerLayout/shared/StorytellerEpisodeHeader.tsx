'use client'

import { PhaseNavigatorCompact } from '../../PhaseNavigator'
import { useStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import type { PhaseId } from '@/domains/storyteller/core/types/enums'
import { StorytellerContextSwitch } from './StorytellerContextSwitch'
import {
  StorytellerHeaderClass,
  StorytellerHeaderCopy,
  StorytellerHeaderSlotId,
} from '../constants/storyteller-module-header'

interface StorytellerEpisodeHeaderProps {
  currentEpisodeId: string | null
  currentPhase: PhaseId
  viewPhase: PhaseId
  isSending: boolean
  hasEpisodes: boolean
  isWorldBibleOpen: boolean
  handlePhaseChange: (phase: PhaseId) => void
  advanceablePhase?: PhaseId
  onOpenBible: () => void
  onCloseBible: () => void
  onCreateEpisode: () => void
}

interface EpisodePhaseTrailProps {
  isEpisodeEditing: boolean
  hasEpisode: boolean
  currentEpisodeId: string | null
  viewPhase: PhaseId
  currentPhase: PhaseId
  advanceablePhase?: PhaseId
  isSending: boolean
  onPhaseChange: (phase: PhaseId) => void
}

function EpisodePhaseTrail({
  isEpisodeEditing,
  hasEpisode,
  currentEpisodeId,
  viewPhase,
  currentPhase,
  advanceablePhase,
  isSending,
  onPhaseChange,
}: EpisodePhaseTrailProps) {
  if (isEpisodeEditing) return null
  if (hasEpisode && currentEpisodeId) {
    return (
      <PhaseNavigatorCompact
        currentPhase={viewPhase}
        progressPhase={currentPhase}
        advanceablePhase={advanceablePhase}
        isWorking={isSending}
        onPhaseChange={onPhaseChange}
      />
    )
  }
  return <span className={StorytellerHeaderClass.Helper}>{StorytellerHeaderCopy.EpisodesFromBible}</span>
}

export function StorytellerEpisodeHeader({
  currentEpisodeId,
  currentPhase,
  viewPhase,
  isSending,
  hasEpisodes,
  isWorldBibleOpen,
  handlePhaseChange,
  advanceablePhase,
  onOpenBible,
  onCloseBible,
  onCreateEpisode,
}: StorytellerEpisodeHeaderProps) {
  const isBibleEditing = useStorytellerUiStore(state => state.isBibleEditing)
  const isEpisodeEditing = useStorytellerUiStore(state => state.isEpisodeEditing)
  const hasEpisode = hasEpisodes
  const isEditingChrome =
    (isBibleEditing && isWorldBibleOpen) || (isEpisodeEditing && !isWorldBibleOpen)

  return (
    <div className={isEditingChrome ? StorytellerHeaderClass.RootEditing : StorytellerHeaderClass.Root}>
      <StorytellerContextSwitch
        bibleSelected={isWorldBibleOpen}
        hasEpisode={hasEpisode}
        disabled={isEditingChrome}
        onSelectBible={onOpenBible}
        onSelectEpisode={onCloseBible}
        onCreateEpisode={onCreateEpisode}
      />
      <div className={StorytellerHeaderClass.Divider} />
      <div
        id={StorytellerHeaderSlotId.BibleChrome}
        className={isWorldBibleOpen ? StorytellerHeaderClass.ChromeSlot : StorytellerHeaderClass.Hidden}
        aria-hidden={!isWorldBibleOpen}
      />
      {isWorldBibleOpen ? null : (
        <EpisodePhaseTrail
          isEpisodeEditing={isEpisodeEditing}
          hasEpisode={hasEpisode}
          currentEpisodeId={currentEpisodeId}
          viewPhase={viewPhase}
          currentPhase={currentPhase}
          advanceablePhase={advanceablePhase}
          isSending={isSending}
          onPhaseChange={handlePhaseChange}
        />
      )}
      <div
        id={StorytellerHeaderSlotId.EpisodeChrome}
        className={!isWorldBibleOpen ? StorytellerHeaderClass.ChromeSlot : StorytellerHeaderClass.Hidden}
        aria-hidden={isWorldBibleOpen}
      />
    </div>
  )
}
