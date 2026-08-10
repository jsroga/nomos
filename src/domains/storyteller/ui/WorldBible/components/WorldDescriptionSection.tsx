import React from 'react'
import { useBible } from './BibleContext'
import { OverviewExecutiveSummary, OverviewMetaGrid } from './OverviewMetaCards'
import { WorldDescriptionBody, WorldDescriptionLoading } from './WorldDescriptionBody'
import { WorldDescriptionHeader } from './WorldDescriptionHeader'
import { resolveOverviewDisplayFields } from '../utils/bible-overview-fields'
import { recordFromJson, readString } from '@/shared/data/json-guards'

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
  const pendingWorldDescription = readString(
    recordFromJson(pendingAction?.preview).worldDescription
  )
  const displayWorldDescription = fields.worldDescription || pendingWorldDescription

  return (
    <section className={isWorldDescLoading || pendingAction ? 'relative' : ''}>
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
        <OverviewMetaGrid
          title={fields.title}
          genre={fields.genre}
          tone={fields.tone}
          centralQuestion={fields.centralQuestion}
        />
      ) : null}

      {!isEditing && fields.executiveSummary ? (
        <OverviewExecutiveSummary summary={fields.executiveSummary} />
      ) : null}

      <WorldDescriptionBody
        isEditing={isEditing}
        worldDescription={displayWorldDescription}
        projectId={projectId}
        onWorldDescriptionChange={value => onChange({ worldDescription: value })}
      />
    </section>
  )
}
