'use client'

import { useCallback } from 'react'
import { cloneSearchParams } from '@/shared/data/url-builder'
import { StorytellerEmptyState } from '../../StorytellerEmptyState'
import {
  StorytellerBibleQuery,
  StorytellerQueryParam,
} from '@/domains/storyteller/core/storyteller-page-wire'
import { isGenerationActivityBusy } from '@/domains/storyteller/state/constants/storyteller-ui-store'
import { useStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import { WorldBiblePanel } from '../storyteller-dynamic-imports'
import type { StorytellerPageSlices } from '@/domains/storyteller/state/hooks/useStorytellerPage'
import { StorytellerEpisodeHeader } from './StorytellerEpisodeHeader'
import { StorytellerActiveTabContent } from './StorytellerActiveTabContent'

export function StorytellerCenterPanel(props: StorytellerPageSlices) {
  const { core, phase, agents } = props
  const {
    primaryMoodboardUrl,
    currentProject,
    currentEpisodeId,
    currentEpisodeTitle,
    hasBible,
    hasEpisodes,
    firstEpisodeId,
    currentPhase,
    viewPhase,
    activeTab,
    setActiveTab,
    isWorldBibleOpen,
    isFetchingPlan,
    sectionPendingActions,
    searchParams,
    router,
    selectEpisode,
    isSending,
    loadingSections,
    setLoadingSections,
  } = core
  const { handleDraftFirstEpisode, handleGenerateBible, handlePreviousPhase, handlePhaseChange } =
    phase
  const { worldBiblePanelStoryPlan, handleUpdateGlobalBible, closeWorldBiblePanel } = agents
  const requestChatPrompt = useStorytellerUiStore(state => state.requestChatPrompt)

  const openBible = () => {
    const params = cloneSearchParams(searchParams)
    params.set(StorytellerQueryParam.Bible, StorytellerBibleQuery.Open)
    router.push(`?${params.toString()}`)
  }

  const handleBibleSendMessage = useCallback(
    (message: string, section?: string) => {
      const { generationActivity } = useStorytellerUiStore.getState()
      if (isGenerationActivityBusy(generationActivity.phase)) return

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
    <div className="flex-1 flex flex-col relative border-r border-border h-full overflow-hidden bg-black">
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

      {currentEpisodeId ? (
        <>
          <StorytellerEpisodeHeader
            currentEpisodeTitle={currentEpisodeTitle}
            currentEpisodeId={currentEpisodeId}
            currentPhase={currentPhase}
            viewPhase={viewPhase}
            isSending={isSending}
            handlePreviousPhase={handlePreviousPhase}
            handlePhaseChange={handlePhaseChange}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <StorytellerActiveTabContent {...props} />
        </>
      ) : (
        <StorytellerEmptyState
          hasBible={hasBible}
          hasEpisodes={hasEpisodes}
          firstEpisodeId={firstEpisodeId}
          isSending={isSending}
          onGenerateBible={handleGenerateBible}
          onDraftFirstEpisode={handleDraftFirstEpisode}
          onSelectFirstEpisode={selectEpisode}
          onOpenBible={openBible}
        />
      )}

      {isWorldBibleOpen && (
        <div className="absolute inset-0 z-20 bg-black overflow-hidden px-6 pb-6 animate-in fade-in zoom-in-95 duration-200">
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
  )
}
