'use client'

import { CorkBoard } from '../../CorkBoard'
import { StorytellerTab } from '@/domains/storyteller/core/storyteller-page-wire'
import { editStorytellerScript } from '@/domains/storyteller/core/io/storyteller.api'
import {
  ScriptEditor,
  StoryPlanBoard,
  CharacterWeb,
} from '../storyteller-dynamic-imports'
import type { StorytellerPageSlices } from '@/domains/storyteller/state/hooks/useStorytellerPage'

export const StorytellerActiveTabContent: React.FC<StorytellerPageSlices> = props => {
  const { core, chat, episode, phase, generation, agents } = props
  const {
    activeTab,
    storyPlan,
    currentProject,
    isGeneratingPoster,
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
  } = core
  const { isSending, setMessages, handleSendMessage } = chat
  const { isFetchingCharacters, updateEpisodePremise, characterWebVersion } = episode
  const { handleApprovePlan } = phase
  const { handlePosterTrigger, handleStoryboardTrigger } = generation
  const {
    generateEpisodePremise,
    generateEpisodePremiseSection,
    handleCharacterWebNodeClick,
  } = agents

  return (
    <div className="flex-1 relative overflow-hidden">
      {activeTab === StorytellerTab.Plan && (
        <StoryPlanBoard
          storyPlan={storyPlan}
          globalBible={currentProject?.series_bible ?? {}}
          onApprove={handleApprovePlan}
          onUpdatePremise={updateEpisodePremise}
          onGeneratePremise={generateEpisodePremise}
          onGeneratePoster={episodeId => void handlePosterTrigger(episodeId)}
          onGenerateStoryboard={episodeId => void handleStoryboardTrigger(episodeId)}
          onGeneratePremiseSection={generateEpisodePremiseSection}
          isGenerating={isSending}
          isGeneratingPoster={isGeneratingPoster}
          isGeneratingStoryboard={isGeneratingStoryboard}
          isLoading={isFetchingPlan || isFetchingCharacters}
          projectId={routeProjectId ?? ''}
          episodeId={currentEpisodeId}
          generatingSection={generatingSection}
        />
      )}

      {activeTab === StorytellerTab.Board && (
        <div className="flex-1 overflow-hidden relative h-full">
          <div className="absolute inset-0 overflow-y-auto p-4">
            <CorkBoard
              beats={beats}
              episodeId={currentEpisodeId || undefined}
              onAddMessage={msg =>
                setMessages(prev => [
                  ...prev,
                  {
                    sender: msg.sender,
                    name: msg.name,
                    content: msg.content,
                    type: msg.type,
                  },
                ])
              }
              onSendMessage={msg => handleSendMessage(undefined, msg)}
              storyboardUrl={storyPlan?.storyboardUrl}
              isGeneratingCombined={isGeneratingStoryboard}
              onGenerateCombined={handleStoryboardTrigger}
              projectId={routeProjectId ?? ''}
            />
          </div>
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
