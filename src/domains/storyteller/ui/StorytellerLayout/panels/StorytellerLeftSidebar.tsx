'use client'

import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { CharacterPanel } from '../../CharacterPanel'
import { Users, AlertCircle, Scroll, FileText } from 'lucide-react'
import {
  DomainSidebar,
  SidebarSection,
  SidebarEmptyState,
  SidebarHeader,
} from '@/components/DomainSidebar'
import { EpisodeManager, MasterPromptEditor } from '../storyteller-dynamic-imports'
import type { StorytellerPageSlices } from '@/domains/storyteller/state/hooks/useStorytellerPage'
import { StorybibleToggleButton } from './StorybibleToggleButton'

export function StorytellerLeftSidebar(props: StorytellerPageSlices) {
  const { core, episode, agents } = props
  const {
    searchParams,
    router,
    currentProject,
    isWorldBibleOpen,
    isBibleLocked,
    bibleLockedBy,
    toggleBible,
    characters,
    selectedBeatId,
    currentEpisodeId,
    currentEpisodeTitle,
    setCurrentEpisodeId,
    setCurrentEpisodeTitle,
    currentEpisode,
  } = core
  const { isSending } = core
  const {
    isFetchingCharacters,
    isDeletingCharacter,
    handleCreateCharacter,
    handleUpdateCharacter,
    handleDeleteCharacter,
  } = episode
  const { handleSaveProjectPrompt, handleSaveEpisodePrompt } = agents

  return (
    <DomainSidebar
          header={
            <div className="flex items-center gap-3 group cursor-default">
              <SidebarHeader>Storyteller</SidebarHeader>
              <StorybibleToggleButton
                isWorldBibleOpen={isWorldBibleOpen}
                isBibleLocked={isBibleLocked}
                bibleLockedBy={bibleLockedBy}
                isSending={isSending}
                onToggle={toggleBible}
              />
            </div>
          }
          storageKey="storyteller"
        >
          {currentProject ? (
            <div className="space-y-6">
              {/* 1. Project Master Prompt */}
              <div id={TOUR_STEP_IDS.STORYTELLER_MASTER_PROMPT}>
                <SidebarSection icon={<Scroll size={12} />}>
                  <MasterPromptEditor
                    scope="Project"
                    initialPrompt={currentProject.master_prompt || ''}
                    onSave={handleSaveProjectPrompt}
                  />
                </SidebarSection>
              </div>

              {/* 2. Cast List - Characters displayed directly in sidebar */}
              <div id={TOUR_STEP_IDS.STORYTELLER_CHARACTERS}>
                <SidebarSection separator icon={<Users size={12} />}>
                  <CharacterPanel
                    characters={characters}
                    onUpdate={handleUpdateCharacter}
                    onCreate={handleCreateCharacter}
                    onDelete={handleDeleteCharacter}
                    projectId={currentProject?.id || ''}
                    selectedBeatId={selectedBeatId}
                    episodeId={currentEpisodeId}
                    isLoading={isFetchingCharacters || isDeletingCharacter}
                  />
                </SidebarSection>
              </div>

              {/* 3. Episode Manager - disabled while agents working */}
              <div id={TOUR_STEP_IDS.STORYTELLER_EPISODES}>
                <SidebarSection separator>
                  <div className={isSending ? 'opacity-50 pointer-events-none' : ''}>
                    <EpisodeManager
                      projectId={currentProject.id}
                      currentEpisodeId={currentEpisodeId}
                      currentEpisodeTitle={currentEpisodeTitle}
                      onEpisodeChange={id => {
                        // Optimistic update
                        setCurrentEpisodeId(id)
                        const params = new URLSearchParams(searchParams?.toString() || '')
                        params.set('episodeId', id)
                        router.push(`?${params.toString()}`)
                      }}
                      onEpisodeTitleChange={title => setCurrentEpisodeTitle(title)}
                    />
                    {isSending && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <AlertCircle size={12} />
                        Can&apos;t change episode while agents are working
                      </div>
                    )}
                  </div>
                </SidebarSection>
              </div>

              {/* 4. Episode Prompt (if episode selected) */}
              {currentEpisodeId && (
                <SidebarSection separator icon={<FileText size={12} />}>
                  <MasterPromptEditor
                    scope="Episode"
                    initialPrompt={currentEpisode?.episode_prompt || ''}
                    onSave={handleSaveEpisodePrompt}
                  />
                </SidebarSection>
              )}
            </div>
          ) : (
            <SidebarEmptyState
              icon={<Users size={24} className="opacity-50" />}
              message="Please select a project to start."
            />
          )}
        </DomainSidebar>
  )
}
