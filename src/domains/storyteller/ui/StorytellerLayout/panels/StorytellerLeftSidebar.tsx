'use client'

import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { CharacterPanel } from '../../CharacterPanel'
import { Users, AlertCircle, Scroll } from 'lucide-react'
import {
  DomainSidebar,
  SidebarSection,
  SidebarEmptyState,
  SidebarHeader,
} from '@/components/DomainSidebar'
import { EpisodeManager, MasterPromptEditor } from '../storyteller-dynamic-imports'
import type { StorytellerPageSlices } from '@/domains/storyteller/state/hooks/useStorytellerPage'
import { StorybibleToggleButton } from './StorybibleToggleButton'
import { MasterPromptScope } from '@/domains/storyteller/ui/MasterPromptEditor/constants/master-prompt-editor'

export function StorytellerLeftSidebar(props: StorytellerPageSlices) {
  const { core, episode, agents } = props
  const {
    currentProject,
    isWorldBibleOpen,
    isBibleLocked,
    bibleLockedBy,
    toggleBible,
    characters,
    selectedBeatId,
    currentEpisodeId,
    currentEpisodeTitle,
    selectEpisode,
    setCurrentEpisodeTitle,
  } = core
  const { isSending } = core
  const {
    isFetchingCharacters,
    isDeletingCharacter,
    handleCreateCharacter,
    handleUpdateCharacter,
    handleDeleteCharacter,
  } = episode
  const { handleSaveProjectPrompt } = agents

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
          <div id={TOUR_STEP_IDS.STORYTELLER_MASTER_PROMPT}>
            <SidebarSection icon={<Scroll size={12} />}>
              <MasterPromptEditor
                scope={MasterPromptScope.Project}
                initialPrompt={currentProject.master_prompt || ''}
                onSave={handleSaveProjectPrompt}
              />
            </SidebarSection>
          </div>

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

          <div id={TOUR_STEP_IDS.STORYTELLER_EPISODES}>
            <SidebarSection separator>
              <div className={isSending ? 'opacity-50 pointer-events-none' : ''}>
                <EpisodeManager
                  projectId={currentProject.id}
                  currentEpisodeId={currentEpisodeId}
                  currentEpisodeTitle={currentEpisodeTitle}
                  onEpisodeChange={selectEpisode}
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
