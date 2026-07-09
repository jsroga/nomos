'use client'

import { cn } from '@/shared/data/utils'
import {
  CorkBoard,
  PhaseNavigatorCompact,
  StorytellerEmptyState,
} from '@/domains/storyteller'
import { StorytellerTab } from '@/domains/storyteller/core/storyteller-page-wire'
import { Network } from 'lucide-react'
import {
  ScriptEditor,
  StoryPlanBoard,
  WorldBiblePanel,
  CharacterWeb,
} from '../storyteller-dynamic-imports'
import type { StorytellerPageState } from '@/domains/storyteller/state/hooks/useStorytellerPage'

export function StorytellerCenterPanel(props: StorytellerPageState) {
  const {
    primaryMoodboardUrl,
    currentProject,
    currentEpisodeId,
    currentEpisodeTitle,
    hasBible,
    hasEpisodes,
    firstEpisodeId,
    handleDraftFirstEpisode,
    handleGenerateBible,
    isSending,
    currentPhase,
    handlePreviousPhase,
    handlePhaseChange,
    activeTab,
    setActiveTab,
    focusEntityId,
    storyPlan,
    handleApprovePlan,
    isGeneratingPoster,
    isGeneratingStoryboard,
    isFetchingPlan,
    isFetchingCharacters,
    routeProjectId,
    generatingSection,
    beats,
    setMessages,
    script,
    setScript,
    isScriptLoading,
    characterWebVersion,
    handleCharacterWebNodeClick,
    isWorldBibleOpen,
    worldBiblePanelStoryPlan,
    handleUpdateGlobalBible,
    handleBibleSendMessage,
    loadingSections,
    sectionPendingActions,
    closeWorldBiblePanel,
    searchParams,
    router,
    selectEpisode,
    handleSendMessage,
    handleStoryboardTrigger,
  } = props

  return (
    <div className="flex-1 flex flex-col relative border-r border-border h-full overflow-hidden bg-black">
          {/* Background image layer when primary moodboard is selected */}
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
          {/* Layer 1: Episode content or empty state (always base layer) */}
          {currentEpisodeId ? (
            <>
              {/* Header Bar */}
              <div className="shrink-0 border-b border-border flex items-center px-4 bg-card justify-between z-40 relative py-2 gap-4 flex-wrap min-h-[60px]">
                <div className="flex items-center gap-3 shrink-0">
                  <h1 className="text-sm font-bold whitespace-nowrap">
                    {currentEpisodeTitle || `Ep. ${currentEpisodeId?.slice(0, 6) || ''}...`}
                  </h1>

                  {/* Unified Phase Navigator */}
                  <PhaseNavigatorCompact
                    currentPhase={currentPhase}
                    isWorking={isSending}
                    onGoBack={handlePreviousPhase}
                    onPhaseChange={handlePhaseChange}
                  />

                  {/* Relationships View Toggle */}
                  <button
                    onClick={() =>
                      setActiveTab(
                        activeTab === StorytellerTab.Relationships
                          ? StorytellerTab.Plan
                          : StorytellerTab.Relationships,
                      )
                    }
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 border',
                      activeTab === StorytellerTab.Relationships
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                        : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 border-transparent'
                    )}
                    title="View character & faction relationships"
                  >
                    <Network size={12} />
                    <span>Relationships</span>
                  </button>
                </div>

                {/* Tabs removed - phase now controls the view automatically */}
              </div>
              {/* Main Content Area */}
              <div className="flex-1 relative overflow-hidden">
                {activeTab === StorytellerTab.Plan && (
                  <StoryPlanBoard
                    storyPlan={storyPlan}
                    globalBible={currentProject?.series_bible ?? {}}
                    onApprove={handleApprovePlan}
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
                        // Combined Storyboard Props
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
                          const res = await fetch('/api/storyteller/script/edit', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ selection, instruction }),
                          })
                          const data = await res.json()
                          if (data.error) throw new Error(data.error)
                          return data.result
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
              onOpenBible={() => {
                const params = new URLSearchParams(searchParams?.toString() || '')
                params.set('bible', 'open')
                router.push(`?${params.toString()}`)
              }}
            />
          )}

          {/* Layer 2: Bible overlay — floats on top based on bible=open param */}
          {isWorldBibleOpen && (
            <div className="absolute inset-0 z-20 bg-black overflow-hidden px-6 pb-6 animate-in fade-in zoom-in-95 duration-200">
              <WorldBiblePanel
                storyPlan={worldBiblePanelStoryPlan}
                projectId={currentProject?.id || ''}
                onUpdate={handleUpdateGlobalBible}
                onSendMessage={handleBibleSendMessage}
                isReadOnly={isSending}
                isLoading={isFetchingPlan}
                loadingSections={loadingSections}
                pendingActions={sectionPendingActions}
                onClose={closeWorldBiblePanel}
              />
            </div>
          )}
        </div>
  )
}
