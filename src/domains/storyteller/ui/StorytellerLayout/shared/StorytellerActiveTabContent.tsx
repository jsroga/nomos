'use client'

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CorkBoard } from '../../CorkBoard'
import { StorytellerTab } from '@/domains/storyteller/core/storyteller-page-wire'
import { editStorytellerScript, patchStorytellerEpisode } from '@/domains/storyteller/core/io/storyteller.api'
import { EpisodePatchColumnName } from '@/domains/storyteller/core/io/episode-patch'
import { storytellerKeys } from '@/domains/storyteller/core/io/storyteller.keys'
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
import { BibleSection, ManuscriptMode, Phase } from '@/domains/storyteller/core/types/enums'
import { pendingActionForCurrentEpisode } from '@/domains/storyteller/ui/WorldBible/utils/pending-action-for-episode'
import { episodePremiseFromPlan } from '@/domains/storyteller/core/utils/validate-premise-for-beatboard'
import { commitBeatCreatesToWorld } from '@/domains/storyteller/ui/StorytellerLayout/panels/writers-room-add-to-world'
import { omitSectionKey } from '@/domains/storyteller/ui/StorytellerLayout/panels/writers-room-tool-helpers'
import { runArtifactDraftOverlay } from '@/domains/storyteller/ui/WorldBible/utils/artifact-draft-overlay'
import { ArtifactKind } from '@/domains/storyteller/core/types/artifact-kind'
import { StorytellerPromptRegistryId } from '@/domains/storyteller/ai/prompts/registry/prompt-registry-ids'
import type { PendingAction } from '@/domains/storyteller/ui/WorldBible/utils/bible-context-types'

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
    setSectionPendingActions,
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
  const queryClient = useQueryClient()

  const setPremisePending = useCallback((section: string, action: PendingAction | null) => {
    setSectionPendingActions(prev => {
      if (action === null) return omitSectionKey(prev, section)
      return { ...prev, [section]: action }
    })
  }, [setSectionPendingActions])

  const startPremiseArtifactDraft = useCallback(async () => {
    const projectId = routeProjectId
    const episodeId = currentEpisodeId
    if (!projectId || !episodeId) return
    await runArtifactDraftOverlay({
      projectId,
      episodeId,
      kind: ArtifactKind.EpisodePremise,
      promptId: StorytellerPromptRegistryId.GenerateEpisodePremiseAgent,
      overlaySection: BibleSection.EPISODE_PREMISE,
      setPendingAction: setPremisePending,
    })
  }, [currentEpisodeId, routeProjectId, setPremisePending])

  const handleGeneratePremise = useCallback(async () => {
    await startPremiseArtifactDraft()
  }, [startPremiseArtifactDraft])

  const handleGeneratePremiseSection = useCallback(async () => {
    await startPremiseArtifactDraft()
  }, [startPremiseArtifactDraft])

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
          onGeneratePremiseSection={handleGeneratePremiseSection}
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
            onRegenerateSelection={async (selection, instruction, context) => {
              if (!routeProjectId) return selection
              try {
                return await editStorytellerScript({
                  projectId: routeProjectId,
                  selection,
                  instruction,
                  beforeText: context?.beforeText,
                  afterText: context?.afterText,
                })
              } catch (e) {
                console.error('Regeneration failed:', e)
                return selection
              }
            }}
            isLoading={isScriptLoading}
            beatCount={beats.length}
            projectId={routeProjectId ?? ''}
            episodeId={currentEpisodeId ?? ''}
            mode={currentEpisode?.manuscriptMode ?? ManuscriptMode.Script}
            onModeChange={next => {
              if (!currentEpisodeId) return
              void (async () => {
                try {
                  await patchStorytellerEpisode(currentEpisodeId, {
                    [EpisodePatchColumnName.ManuscriptMode]: next,
                  })
                  await queryClient.invalidateQueries({
                    queryKey: storytellerKeys.episode(currentEpisodeId),
                  })
                } catch {
                  // Episode mode patch is best-effort; the editor stays on the prior mode.
                }
              })()
            }}
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
