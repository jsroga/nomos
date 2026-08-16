'use client'

/**
 * ReferenceText Component
 *
 * Renders text containing entity references [Name][id] with:
 * - Hover tooltips showing entity details
 * - Clickable links for navigation
 * - Visual styling based on entity type
 * - Alt-key sticky tooltips (like Crusader Kings 3)
 */

import React, { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useEntities } from '@/domains/storyteller/state/queries/useEntity'
import { cn } from '@/shared/data/utils'
import {
  splitIntoSegments,
  TextSegment,
} from '@/domains/storyteller/core/entities/reference-parser'
import {
  EntityReference,
  EntityRelationship,
  EntityType,
} from '@/domains/storyteller/core/entities/entity-references'
import {
  REFERENCE_RESOLVE_CONTEXT_MAX,
  ReferenceSegmentType,
  RichTextContainerTag,
} from './constants/reference-text-display'
import { markEntityReferenced } from '@/domains/storyteller/core/io/entities.api'
import { StorytellerQueryKey } from '@/domains/storyteller/core/io/constants/query-keys'
import { storytellerKeys } from '@/domains/storyteller/core/io/storyteller.keys'
import { EntityChip } from './components/EntityChip'
import {
  shouldRefetchEntityForTooltip,
  shouldShowEntityTooltipLoading,
} from './utils/should-show-entity-tooltip-loading'

export type { EntityReference, EntityRelationship, EntityType }

interface ReferenceTextProps {
  text: string
  onEntityClick?: (refId: string, entity: EntityReference | null) => void
  projectId?: string
  className?: string
  inline?: boolean
  renderText?: (text: string, index: number) => React.ReactNode
  initialEntities?: Map<string, EntityReference>
}

function collectReferenceIds(segments: TextSegment[]): string[] {
  return segments
    .filter(
      (s): s is TextSegment & { type: ReferenceSegmentType.Reference } =>
        s.type === ReferenceSegmentType.Reference
    )
    .map(s => s.ref.refId)
}

function buildEntityMap(
  initialEntities: Map<string, EntityReference> | undefined,
  queryResults: ReturnType<typeof useEntities>,
  refIds: string[]
): Map<string, EntityReference> {
  const map = new Map(initialEntities || [])
  queryResults.forEach((result, index) => {
    if (result.data) {
      map.set(refIds[index], result.data)
    }
  })
  return map
}

function collectLoadingIds(
  queryResults: ReturnType<typeof useEntities>,
  refIds: string[],
  initialEntities: Map<string, EntityReference> | undefined
): Set<string> {
  const set = new Set<string>()
  queryResults.forEach((result, index) => {
    const refId = refIds[index]
    const entity = result.data ?? initialEntities?.get(refId) ?? null
    if (shouldShowEntityTooltipLoading(result.isPending, result.isFetching, entity)) {
      set.add(refId)
    }
  })
  return set
}

export const ReferenceText: React.FC<ReferenceTextProps> = ({
  text,
  onEntityClick,
  projectId,
  className,
  inline = true,
  renderText,
  initialEntities,
}) => {
  const segments = useMemo(() => splitIntoSegments(text), [text])
  const refIds = useMemo(() => collectReferenceIds(segments), [segments])
  const resolveContext = useMemo(
    () => text.slice(0, REFERENCE_RESOLVE_CONTEXT_MAX),
    [text]
  )
  const queryClient = useQueryClient()
  const queryResults = useEntities(refIds, projectId, resolveContext)

  const loadingIds = useMemo(
    () => collectLoadingIds(queryResults, refIds, initialEntities),
    [queryResults, refIds, initialEntities]
  )

  const finalEntities = useMemo(
    () => buildEntityMap(initialEntities, queryResults, refIds),
    [initialEntities, queryResults, refIds]
  )

  const handleTooltipOpened = (refId: string, entity: EntityReference | null) => {
    if (!projectId) return
    if (!shouldRefetchEntityForTooltip(entity)) return
    void queryClient.invalidateQueries({
      queryKey: [...storytellerKeys.all, StorytellerQueryKey.Entity, projectId, refId],
    })
  }

  const handleEntityClick = (refId: string, entity: EntityReference | null) => {
    if (projectId) {
      void markEntityReferenced(projectId, refId).catch(() => {})
    }
    onEntityClick?.(refId, entity)
  }

  const renderedContent = segments.map((segment, index) => {
    if (segment.type === ReferenceSegmentType.Text) {
      if (renderText) {
        return <React.Fragment key={index}>{renderText(segment.content, index)}</React.Fragment>
      }
      return <span key={index}>{segment.content}</span>
    }

    const entity = finalEntities.get(segment.ref.refId) || null
    const isLoading = loadingIds.has(segment.ref.refId)

    return (
      <EntityChip
        key={`${segment.ref.refId}-${index}`}
        parsedRef={segment.ref}
        entity={entity}
        isLoading={isLoading}
        onClick={handleEntityClick}
        onTooltipOpened={
          isLoading ? undefined : () => handleTooltipOpened(segment.ref.refId, entity)
        }
      />
    )
  })

  const Container = inline ? RichTextContainerTag.Span : RichTextContainerTag.Div

  return <Container className={cn('whitespace-pre-wrap', className)}>{renderedContent}</Container>
}
