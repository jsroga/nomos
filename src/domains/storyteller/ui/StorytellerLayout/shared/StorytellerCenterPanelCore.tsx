'use client'

import { useCallback } from 'react'
import { StorytellerEmptyState } from '../../StorytellerEmptyState'
import { useStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import { WorldBiblePanel } from '../storyteller-dynamic-imports'
import type { StorytellerPageSlices } from '@/domains/storyteller/state/hooks/useStorytellerPage'
import { StorytellerEpisodeHeader } from './StorytellerEpisodeHeader'
import { StorytellerActiveTabContent } from './StorytellerActiveTabContent'
import { storytellerAdvanceablePhase } from '@/domains/storyteller/state/utils/resolve-storyteller-phase-click'

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
  const requestChatPrompt = useStorytellerUiStore(state => state.requestChatPrompt)

  const handleBibleSendMessage = useCallback(
    (message: string, section?: string) => {
      if (section) {
        setLoadingSections(prev => ({
          ...prev,
          [section]: { loading: true },
        }))
      }
      requestChatPrompt(message, section)
    },
    [requestChatPrompt, setLoadingSections]
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
          const episodeId = currentEpisodeId ?? firstEpisodeId
          if (episodeId) {
            selectEpisode(episodeId)
            return
          }
          setWorldBibleOpen(false)
        }}
        onCreateEpisode={() => {
          void handleDraftFirstEpisode()
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

        {isWorldBibleOpen && (
          <div className="absolute inset-0 z-20 bg-background overflow-hidden min-h-0 flex flex-col animate-in fade-in zoom-in-95 duration-200">
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
        )}
      </div>
    </div>
  )
}
