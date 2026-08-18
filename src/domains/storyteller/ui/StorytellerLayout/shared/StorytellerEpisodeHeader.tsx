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

export const StorytellerEpisodeHeader: React.FC<StorytellerEpisodeHeaderProps> = ({
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
}) => {
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
      {isWorldBibleOpen ? (
        <div
          id={StorytellerHeaderSlotId.BibleChrome}
          className="flex flex-1 items-center gap-3.5 min-w-0"
        />
      ) : (
        <>
          {isEpisodeEditing ? null : hasEpisode && currentEpisodeId ? (
            <PhaseNavigatorCompact
              currentPhase={viewPhase}
              progressPhase={currentPhase}
              advanceablePhase={advanceablePhase}
              isWorking={isSending}
              onPhaseChange={handlePhaseChange}
            />
          ) : (
            <span className={StorytellerHeaderClass.Helper}>{StorytellerHeaderCopy.EpisodesFromBible}</span>
          )}
          <div
            id={StorytellerHeaderSlotId.EpisodeChrome}
            className="flex flex-1 items-center gap-3.5 min-w-0"
          />
        </>
      )}
    </div>
  )
}
