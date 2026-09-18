'use client'

import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { CharacterPanel } from '../../CharacterPanel'
import { Users } from 'lucide-react'
import {
  DomainSidebar,
  SidebarSection,
  SidebarEmptyState,
  SidebarHeader,
} from '@/components/DomainSidebar'
import { EpisodeManager } from '../storyteller-dynamic-imports'
import { MasterPromptEditor } from '../../MasterPromptEditor'
import type { StorytellerPageSlices } from '@/domains/storyteller/state/hooks/useStorytellerPage'
import { MasterPromptScope } from '@/domains/storyteller/ui/MasterPromptEditor/constants/master-prompt-editor'
import { StorytellerSidebarCopy, StorytellerSidebarStorageKey } from '../utils/storyteller-sidebar-footer'
import { StorytellerHeaderCopy } from '../constants/storyteller-module-header'
import { StorytellerSidebarFooter } from './StorytellerSidebarFooter'
import { StyleRefsPanel, StyleRefOwner, useProjectStyleRefs } from '@/shared/canvas/style-refs'

interface StorytellerLeftSidebarProps extends StorytellerPageSlices {
  onFixInconsistencies: () => void
}

export function StorytellerLeftSidebar(props: StorytellerLeftSidebarProps) {
  const { core, episode, agents } = props
  const {
    currentProject,
    isWorldBibleOpen,
    characters,
    selectedBeatId,
    currentEpisodeId,
    currentEpisodeTitle,
    currentPhase,
    hasBible,
    selectEpisode,
    setCurrentEpisodeTitle,
  } = core
  const {
    isFetchingCharacters,
    isDeletingCharacter,
    handleCreateCharacter,
    handleUpdateCharacter,
    handleDeleteCharacter,
  } = episode
  const { handleSaveProjectPrompt } = agents
  const styleRefs = useProjectStyleRefs(currentProject, StyleRefOwner.Storyteller)

  return (
    <DomainSidebar
      header={<SidebarHeader>{StorytellerHeaderCopy.Wordmark}</SidebarHeader>}
      storageKey={StorytellerSidebarStorageKey.Panel}
      collapsible
      wordmark={StorytellerHeaderCopy.Wordmark}
      collapseStorageId={currentProject?.id}
      footer={<StorytellerSidebarFooter hasBible={hasBible} onFix={props.onFixInconsistencies} />}
    >
      {currentProject ? (
        <div className="space-y-6">
          <div id={TOUR_STEP_IDS.STORYTELLER_MASTER_PROMPT}>
            <MasterPromptEditor
              scope={MasterPromptScope.Project}
              hydrateKey={currentProject.id}
              initialPrompt={currentProject.master_prompt || ''}
              onSave={handleSaveProjectPrompt}
              onAcceptStyleImages={styleRefs.replaceStyleReferenceUrls}
            />
            <StyleRefsPanel
              showAdminCatalog={false}
              catalogItems={[]}
              catalogSaving={false}
              onToggleCatalogSref={() => undefined}
              styleReferenceUrls={styleRefs.styleReferenceUrls}
              isUploadingStyleRefs={styleRefs.isUploadingStyleRefs}
              isApplyingGenerationMode={false}
              handleAddStyleRefFiles={styleRefs.handleAddStyleRefFiles}
              handleRemoveStyleRef={styleRefs.handleRemoveStyleRef}
              handleRestoreStyleRefs={styleRefs.handleRestoreStyleRefs}
            />
          </div>

          <div id={TOUR_STEP_IDS.STORYTELLER_EPISODES}>
            <SidebarSection separator>
              <EpisodeManager
                projectId={currentProject.id}
                currentEpisodeId={currentEpisodeId}
                currentEpisodeTitle={currentEpisodeTitle}
                currentPhase={currentPhase}
                isWorldBibleOpen={isWorldBibleOpen}
                onEpisodeChange={selectEpisode}
                onEpisodeTitleChange={title => setCurrentEpisodeTitle(title)}
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
        </div>
      ) : (
        <SidebarEmptyState
          icon={<Users size={24} className="opacity-50" />}
          message={StorytellerSidebarCopy.SelectProject}
        />
      )}
    </DomainSidebar>
  )
}
