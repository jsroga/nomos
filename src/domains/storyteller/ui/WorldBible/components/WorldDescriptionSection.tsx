import React from 'react'
import { useBible } from './BibleContext'
import { OverviewExecutiveSummary, OverviewMetaGrid } from './OverviewMetaCards'
import { WorldDescriptionBody, WorldDescriptionLoading } from './WorldDescriptionBody'
import { WorldDescriptionHeader } from './WorldDescriptionHeader'
import { pendingReviewHostClass } from '../constants/section-pending-overlay'
import { resolveOverviewDisplayFields } from '../utils/bible-overview-fields'
import { StorytellerPromptRegistryId } from '@/domains/storyteller/ai/prompts/registry/prompt-registry-ids'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { runBibleSectionArtifactDraft } from '../utils/artifact-draft-overlay'

export const WorldDescriptionSection: React.FC = () => {
  const {
    storyPlan,
    isEditing,
    localPlan,
    updateLocalPlan: onChange,
    isReadOnly,
    projectId,
    loadingSections,
    pendingActions,
    setPendingAction,
  } = useBible()

  const isWorldDescLoading = loadingSections?.worldDescription?.loading ?? false
  const pendingAction = pendingActions?.worldDescription
  const fields = resolveOverviewDisplayFields(storyPlan, localPlan)

  return (
    <section className={pendingReviewHostClass(Boolean(pendingAction), isWorldDescLoading)}>
      <WorldDescriptionLoading
        isWorldDescLoading={isWorldDescLoading}
        pendingAction={pendingAction}
      />
      <WorldDescriptionHeader
        isReadOnly={isReadOnly}
        isWorldDescLoading={isWorldDescLoading}
        onGenerate={async () => {
          await runBibleSectionArtifactDraft({
            projectId,
            section: BibleSection.WORLD_DESCRIPTION,
            promptId: StorytellerPromptRegistryId.WorldDescriptionRegen,
            setPendingAction,
          })
        }}
      />

      {!isEditing ? (
        <OverviewMetaGrid centralQuestion={fields.centralQuestion} />
      ) : null}

      {!isEditing && fields.executiveSummary ? (
        <OverviewExecutiveSummary summary={fields.executiveSummary} />
      ) : null}

      <WorldDescriptionBody
        isEditing={isEditing}
        worldDescription={fields.worldDescription}
        projectId={projectId}
        onWorldDescriptionChange={value => onChange({ worldDescription: value })}
      />
    </section>
  )
}
