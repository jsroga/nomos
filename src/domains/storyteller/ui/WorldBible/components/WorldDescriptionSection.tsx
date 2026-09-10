import React from 'react'
import { useBible } from './BibleContext'
import { OverviewExecutiveSummary, OverviewMetaGrid } from './OverviewMetaCards'
import { WorldDescriptionBody, WorldDescriptionLoading } from './WorldDescriptionBody'
import { WorldDescriptionHeader } from './WorldDescriptionHeader'
import { pendingReviewHostClass } from '../utils/section-pending-overlay'
import { resolveOverviewDisplayFields } from '../utils/bible-overview-fields'
import { StorytellerPromptRegistryId } from '@/domains/storyteller/ai/prompts/registry/prompt-registry-ids'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { requestBibleSectionChatRefresh } from '../utils/bible-section-chat-refresh'

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
    onSendMessage,
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
        onGenerate={() => {
          requestBibleSectionChatRefresh({
            onSendMessage,
            section: BibleSection.WORLD_DESCRIPTION,
            promptId: StorytellerPromptRegistryId.WorldDescriptionRegen,
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
