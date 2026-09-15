'use client'

import { useCallback } from 'react'
import { StorytellerEmptyState } from '../../StorytellerEmptyState'
import { getStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import { enqueueStorytellerChatPrompt } from '@/domains/storyteller/state/utils/enqueue-storyteller-chat'
import { WorldBiblePanel } from '../storyteller-dynamic-imports'
import type { StorytellerPageSlices } from '@/domains/storyteller/state/hooks/useStorytellerPage'
import { StorytellerEpisodeHeader } from './StorytellerEpisodeHeader'
import { StorytellerActiveTabContent } from './StorytellerActiveTabContent'
import { storytellerAdvanceablePhase } from '@/domains/storyteller/state/utils/resolve-storyteller-phase-click'
import { StorytellerHeaderClass } from '../constants/storyteller-module-header'

export function StorytellerCenterPanel(props: StorytellerPageSlices) {
  const { core, phase, agents } = props
  const {
    primaryMoodboardUrl,
    currentProject,
    currentEpisodeId,
    hasBible,
    hasEpisodes,
    firstEpisodeId,
    currentPhase,
    viewPhase,
    beats,
    isWorldBibleOpen,
    isFetchingPlan,
    sectionPendingActions,
    selectEpisode,
    isSending,
    loadingSections,
    setLoadingSections,
    setWorldBibleOpen,
  } = core
  const { handleDraftFirstEpisode, handleGenerateBible, handlePhaseChange } =
    phase
  const { worldBiblePanelStoryPlan, handleUpdateGlobalBible, closeWorldBiblePanel } = agents

  const handleBibleSendMessage = useCallback(
    (message: string, section?: string) => {
      const seqBefore = getStorytellerUiStore().pendingChatPromptSeq
      if (section) {
        setLoadingSections(prev => ({
          ...prev,
          [section]: { loading: true },
        }))
      }
      const queued = enqueueStorytellerChatPrompt(message, section)
      if (section && (!queued || getStorytellerUiStore().pendingChatPromptSeq === seqBefore)) {
        setLoadingSections(prev => {
          if (!(section in prev)) return prev
          const next = { ...prev }
          Reflect.deleteProperty(next, section)
          return next
        })
      }
    },
    [setLoadingSections]
  )

  return (
    <div className="flex-1 flex flex-col relative border-r border-border h-full overflow-hidden bg-background">
      {primaryMoodboardUrl && (
        <div className="absolute inset-x-0 top-0 h-[400px] z-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${primaryMoodboardUrl})`,
              opacity: 0.35,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/70 to-black" />
        </div>
      )}

      <StorytellerEpisodeHeader
        currentEpisodeId={currentEpisodeId}
        currentPhase={currentPhase}
        viewPhase={viewPhase}
        isSending={isSending}
        hasEpisodes={hasEpisodes}
        isWorldBibleOpen={isWorldBibleOpen}
        handlePhaseChange={handlePhaseChange}
        advanceablePhase={storytellerAdvanceablePhase({
          currentPhase,
          beatCount: beats.length,
        })}
        onOpenBible={() => setWorldBibleOpen(true)}
        onCloseBible={() => {
          if (currentEpisodeId) {
            setWorldBibleOpen(false)
            return
          }
          if (firstEpisodeId) {
            selectEpisode(firstEpisodeId)
            return
          }
          setWorldBibleOpen(false)
        }}
        onCreateEpisode={() => {
          getStorytellerUiStore().requestCreateEpisodeDialog()
        }}
      />

      <div className="flex-1 relative min-h-0 overflow-hidden">
        {currentEpisodeId ? (
          <StorytellerActiveTabContent {...props} />
        ) : (
          <StorytellerEmptyState
            hasBible={hasBible}
            hasEpisodes={hasEpisodes}
            firstEpisodeId={firstEpisodeId}
            isSending={isSending}
            onGenerateBible={handleGenerateBible}
            onDraftFirstEpisode={handleDraftFirstEpisode}
            onSelectFirstEpisode={selectEpisode}
            onOpenBible={() => setWorldBibleOpen(true)}
          />
        )}

        <div
          className={isWorldBibleOpen ? StorytellerHeaderClass.BibleLayer : StorytellerHeaderClass.Hidden}
          hidden={!isWorldBibleOpen}
          aria-hidden={!isWorldBibleOpen}
        >
          <WorldBiblePanel
            storyPlan={worldBiblePanelStoryPlan}
            projectId={currentProject?.id || ''}
            onUpdate={handleUpdateGlobalBible}
            isReadOnly={isSending}
            isLoading={isFetchingPlan}
            loadingSections={loadingSections}
            pendingActions={sectionPendingActions}
            onClose={closeWorldBiblePanel}
            onSendMessage={handleBibleSendMessage}
          />
        </div>
      </div>
    </div>
  )
}
