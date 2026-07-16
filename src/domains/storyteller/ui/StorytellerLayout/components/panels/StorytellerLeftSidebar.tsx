'use client'

import { cn } from '@/shared/data/utils'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { CharacterPanel } from '@/domains/storyteller'
import { Lock, BookOpen, Users, AlertCircle, Scroll, FileText } from 'lucide-react'
import { Button } from '@/components/Button'
import { cloneSearchParams } from '@/shared/data/url-builder'
import {
  DomainSidebar,
  SidebarSection,
  SidebarEmptyState,
  SidebarHeader,
} from '@/components/DomainSidebar'
import { EpisodeManager, MasterPromptEditor } from '../storyteller-dynamic-imports'
import type { StorytellerPageState } from '@/domains/storyteller/state/hooks/useStorytellerPage'

export function StorytellerLeftSidebar(props: StorytellerPageState) {
  const {
    searchParams,
    router,
    currentProject,
    isWorldBibleOpen,
    isBibleLocked,
    bibleLockedBy,
    isSending,
    toggleBible,
    characters,
    selectedBeatId,
    currentEpisodeId,
    currentEpisodeTitle,
    setCurrentEpisodeId,
    setCurrentEpisodeTitle,
    currentEpisode,
    isFetchingCharacters,
    isDeletingCharacter,
    handleCreateCharacter,
    handleUpdateCharacter,
    handleDeleteCharacter,
    handleSaveProjectPrompt,
    handleSaveEpisodePrompt,
  } = props

  return (
    <DomainSidebar
          header={
            <div className="flex items-center gap-3 group cursor-default">
              <SidebarHeader>Storyteller</SidebarHeader>
              <Button
                variant={isWorldBibleOpen ? 'default' : 'outline'}
                size="sm"
                onClick={toggleBible}
                disabled={isSending}
                className={cn(
                  'h-7 px-3 gap-1.5 text-[10px] font-bold border transition-colors duration-150 rounded-md uppercase tracking-widest active:scale-[0.98]',
                  isWorldBibleOpen
                    ? isBibleLocked
                      ? 'bg-red-500/15 text-red-400 border-red-500/40 hover:bg-red-500/25'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/40 hover:bg-amber-500/25'
                    : isBibleLocked
                      ? 'bg-transparent text-red-400/70 border-red-500/30 hover:bg-red-500/10 hover:text-red-400'
                      : 'bg-transparent text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground',
                  isSending && 'opacity-50 cursor-not-allowed'
                )}
                title={
                  isSending
                    ? 'Storybible unavailable while agents are working'
                    : isBibleLocked
                      ? `Storybible Locked by ${bibleLockedBy || 'Admin'} - ${isWorldBibleOpen ? 'Close' : 'Open'} (Read-Only)`
                      : isWorldBibleOpen
                        ? 'Close Storybible'
                        : 'Open Storybible'
                }
                id={TOUR_STEP_IDS.STORYTELLER_BIBLE}
              >
                {isBibleLocked ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  <BookOpen className="w-3.5 h-3.5" />
                )}
                <span>{isWorldBibleOpen ? 'BIBLE · OPEN' : 'STORYBIBLE'}</span>
              </Button>
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
                        const params = cloneSearchParams(searchParams)
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
