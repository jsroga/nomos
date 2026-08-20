'use client'

import { useCallback } from 'react'
import { CorkBoard } from '../../CorkBoard'
import { StorytellerTab } from '@/domains/storyteller/core/storyteller-page-wire'
import { editStorytellerScript } from '@/domains/storyteller/core/io/storyteller.api'
import {
  ScriptEditor,
  StoryPlanBoard,
  CharacterWeb,
} from '../storyteller-dynamic-imports'
import type { StorytellerPageSlices } from '@/domains/storyteller/state/hooks/useStorytellerPage'
import {
  getStorytellerUiStore,
  useStorytellerUiStore,
} from '@/domains/storyteller/state/useStorytellerUiStore'
import { isGenerationActivityBusy } from '@/domains/storyteller/state/constants/storyteller-ui-store'
import { StorytellerAgentTriggerPrompt } from '@/domains/storyteller/state/constants/agent-trigger-prompts'
import { BibleSection, Phase } from '@/domains/storyteller/core/types/enums'
import { EpisodePremiseSectionKey } from '@/domains/storyteller/ui/EpisodePremisePanel/constants/ozymandias-sections'
import { pendingActionForCurrentEpisode } from '@/domains/storyteller/ui/WorldBible/utils/pending-action-for-episode'
import { episodePremiseFromPlan } from '@/domains/storyteller/core/utils/validate-premise-for-beatboard'
import { commitBeatCreatesToWorld } from '@/domains/storyteller/ui/StorytellerLayout/panels/writers-room-add-to-world'

export const StorytellerActiveTabContent: React.FC<StorytellerPageSlices> = props => {
  const { core, episode, phase, generation, agents } = props
  const {
    activeTab,
    storyPlan,
    currentProject,
    isGeneratingPoster,
    posterIsVariantGrid,
    isGeneratingStoryboard,
    isFetchingPlan,
    routeProjectId,
    currentEpisodeId,
    generatingSection,
    beats,
    script,
    setScript,
    isScriptLoading,
    focusEntityId,
    isSending,
    sectionPendingActions,
    loadingSections,
    setLoadingSections,
    currentEpisode,
    currentEpisodeTitle,
    setActiveTab,
    closeBible,
    refreshBeats,
    executeAction,
  } = core
  const { isFetchingCharacters, updateEpisodePremise, characterWebVersion } = episode
  const { handleApprovePlan, handlePhaseChange } = phase
  const { handlePosterTrigger, handleStoryboardTrigger } = generation
  const { handleCharacterWebNodeClick, handleSaveEpisodePrompt } = agents
  const requestChatPrompt = useStorytellerUiStore(state => state.requestChatPrompt)
  const generationPhase = useStorytellerUiStore(state => state.generationActivity.phase)
  const isChatBusy = isGenerationActivityBusy(generationPhase)

  const queuePremisePrompt = useCallback(
    (message: string) => {
      setLoadingSections(prev => ({
        ...prev,
        [BibleSection.EPISODE_PREMISE]: { loading: true },
      }))
      requestChatPrompt(message, BibleSection.EPISODE_PREMISE)
    },
    [requestChatPrompt, setLoadingSections]
  )

  const handleGeneratePremise = useCallback(() => {
    queuePremisePrompt(StorytellerAgentTriggerPrompt.GenerateEpisodePremiseUser)
  }, [queuePremisePrompt])

  const handleGeneratePremiseSection = useCallback(
    (section: string) => {
      if (section === EpisodePremiseSectionKey.Logline) {
        queuePremisePrompt(StorytellerAgentTriggerPrompt.GenerateEpisodeDescriptionUser)
        return
      }
      queuePremisePrompt(
        `${StorytellerAgentTriggerPrompt.RegeneratePremiseSectionUserPrefix}${section}${StorytellerAgentTriggerPrompt.RegeneratePremiseSectionUserSuffix}`
      )
    },
    [queuePremisePrompt]
  )

  const handleAddGeneratedBeats = useCallback(async () => {
    await commitBeatCreatesToWorld({
      toolArgs: getStorytellerUiStore().pendingBeatAdds,
      currentEpisodeId,
      executeAction,
      setActiveTab,
      closeBible,
      refreshBeats,
    })
  }, [closeBible, currentEpisodeId, executeAction, refreshBeats, setActiveTab])

  return (
    <div className="h-full min-h-0 overflow-hidden flex flex-col">
      {activeTab === StorytellerTab.Plan && (
        <StoryPlanBoard
          storyPlan={storyPlan}
          globalBible={currentProject?.series_bible ?? {}}
          onApprove={handleApprovePlan}
          onUpdatePremise={updateEpisodePremise}
          onGeneratePremise={handleGeneratePremise}
          onGeneratePremiseSection={section => handleGeneratePremiseSection(section)}
          onGeneratePoster={episodeId => void handlePosterTrigger(episodeId)}
          onGenerateStoryboard={episodeId => void handleStoryboardTrigger(episodeId)}
          isGenerating={
            isChatBusy ||
            isSending ||
            Boolean(loadingSections[BibleSection.EPISODE_PREMISE]?.loading)
          }
          isGeneratingPoster={isGeneratingPoster}
          posterIsVariantGrid={posterIsVariantGrid}
          isGeneratingStoryboard={isGeneratingStoryboard}
          isLoading={isFetchingPlan || isFetchingCharacters}
          projectId={routeProjectId ?? ''}
          episodeId={currentEpisodeId}
          generatingSection={generatingSection}
          pendingPremiseAction={pendingActionForCurrentEpisode(
            sectionPendingActions[BibleSection.EPISODE_PREMISE],
            currentEpisodeId,
          )}
          episodeTitle={currentEpisodeTitle}
          episodePrompt={currentEpisode?.episode_prompt ?? ''}
          onSaveEpisodePrompt={handleSaveEpisodePrompt}
        />
      )}

      {activeTab === StorytellerTab.Board && (
        <div className="h-full min-h-0 overflow-hidden">
          <CorkBoard
            beats={beats}
            episodeId={currentEpisodeId || undefined}
            storyboardUrl={storyPlan?.storyboardUrl}
            isGeneratingCombined={isGeneratingStoryboard}
            onGenerateCombined={(model, look) =>
              void handleStoryboardTrigger(undefined, model, look)
            }
            projectId={routeProjectId ?? ''}
            premise={episodePremiseFromPlan(storyPlan)}
            isChatBusy={isChatBusy}
            onSendMessage={message => requestChatPrompt(message)}
            onRefreshBeats={() => {
              if (currentEpisodeId) void refreshBeats(currentEpisodeId)
            }}
            onAddGeneratedBeats={handleAddGeneratedBeats}
            onContinueToDraft={() => handlePhaseChange(Phase.WRITING)}
          />
        </div>
      )}

      {activeTab === StorytellerTab.Script && (
        <div className="flex-1 overflow-hidden flex flex-col h-full">
          <ScriptEditor
            content={script}
            onChange={setScript}
            onRegenerateSelection={async (selection, instruction) => {
              try {
                return await editStorytellerScript({ selection, instruction })
              } catch (e) {
                console.error('Regeneration failed:', e)
                return selection
              }
            }}
            isLoading={isScriptLoading}
          />
        </div>
      )}

      {activeTab === StorytellerTab.Relationships && (
        <div className="flex-1 overflow-hidden relative h-full">
          <CharacterWeb
            projectId={routeProjectId ?? ''}
            className="h-full"
            focusEntityId={focusEntityId}
            onNodeClick={handleCharacterWebNodeClick}
            key={characterWebVersion}
          />
        </div>
      )}
    </div>
  )
}
