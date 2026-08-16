import React from 'react'
import { useBible } from './BibleContext'
import { OverviewExecutiveSummary, OverviewMetaGrid } from './OverviewMetaCards'
import { WorldDescriptionBody, WorldDescriptionLoading } from './WorldDescriptionBody'
import { WorldDescriptionHeader } from './WorldDescriptionHeader'
import { pendingReviewHostClass } from '../constants/section-pending-overlay'
import { resolveOverviewDisplayFields } from '../utils/bible-overview-fields'

export const WorldDescriptionSection: React.FC = () => {
  const {
    storyPlan,
    isEditing,
    localPlan,
    updateLocalPlan: onChange,
    isReadOnly,
    onSendMessage,
    projectId,
    loadingSections,
    pendingActions,
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
        onSendMessage={onSendMessage}
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
