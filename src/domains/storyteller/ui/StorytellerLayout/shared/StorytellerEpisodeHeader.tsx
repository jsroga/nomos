'use client'

import { BookOpen, ScrollText } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { PhaseNavigatorCompact } from '../../PhaseNavigator'
import { useStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import { StorytellerTab } from '@/domains/storyteller/core/storyteller-page-wire'
import { ManuscriptMode, type PhaseId } from '@/domains/storyteller/core/types/enums'
import { persistEpisodeManuscriptMode } from '@/domains/storyteller/state/utils/persist-episode-manuscript-mode'
import { StorytellerContextSwitch } from './StorytellerContextSwitch'
import { StorytellerHeaderSwitch } from './StorytellerHeaderSwitch'
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
  activeTab: string
  manuscriptMode: ManuscriptMode
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

function ManuscriptModeSwitch({
  currentEpisodeId,
  manuscriptMode,
  disabled,
}: {
  currentEpisodeId: string
  manuscriptMode: ManuscriptMode
  disabled: boolean
}) {
  const queryClient = useQueryClient()
  const scriptSelected = manuscriptMode === ManuscriptMode.Script
  return (
    <StorytellerHeaderSwitch
      label={StorytellerHeaderCopy.Manuscript}
      disabled={disabled}
      className={StorytellerHeaderClass.SwitchEnd}
      items={[
        {
          id: ManuscriptMode.Script,
          label: StorytellerHeaderCopy.Script,
          icon: <ScrollText size={13} strokeWidth={1.7} />,
          selected: scriptSelected,
          onSelect: () => {
            void persistEpisodeManuscriptMode(
              queryClient,
              currentEpisodeId,
              ManuscriptMode.Script,
            )
          },
        },
        {
          id: ManuscriptMode.Novel,
          label: StorytellerHeaderCopy.Novel,
          icon: <BookOpen size={13} strokeWidth={1.7} />,
          selected: !scriptSelected,
          onSelect: () => {
            void persistEpisodeManuscriptMode(
              queryClient,
              currentEpisodeId,
              ManuscriptMode.Novel,
            )
          },
        },
      ]}
    />
  )
}

export function StorytellerEpisodeHeader({
  currentEpisodeId,
  currentPhase,
  viewPhase,
  isSending,
  hasEpisodes,
  isWorldBibleOpen,
  activeTab,
  manuscriptMode,
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
  const showManuscriptSwitch =
    Boolean(currentEpisodeId) &&
    !isWorldBibleOpen &&
    !isEpisodeEditing &&
    activeTab === StorytellerTab.Script

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
      {showManuscriptSwitch && currentEpisodeId ? (
        <ManuscriptModeSwitch
          currentEpisodeId={currentEpisodeId}
          manuscriptMode={manuscriptMode}
          disabled={isEditingChrome}
        />
      ) : null}
      <div
        id={StorytellerHeaderSlotId.EpisodeChrome}
        className={
          isWorldBibleOpen
            ? StorytellerHeaderClass.Hidden
            : showManuscriptSwitch
              ? StorytellerHeaderClass.ChromeEnd
              : StorytellerHeaderClass.ChromeSlot
        }
        aria-hidden={isWorldBibleOpen}
      />
    </div>
  )
}
