'use client'

/**
 * RichText Component
 *
 * A simple wrapper around ReferenceText for rendering text that may contain
 * entity references [Name][id]. Automatically gets projectId from context.
 *
 * Use this in all Bible and Episode components to render any text that might
 * contain entity references (descriptions, ideologies, goals, etc.)
 *
 * Usage:
 * <RichText text={faction.ideology} />
 * <RichText text={worldDescription} className="text-lg" />
 */

import React, { useMemo } from 'react'
import { ReferenceText, type EntityReference } from '../ReferenceText'
import { hasReferences } from '@/domains/storyteller/core/entities/reference-parser'
import { cn } from '@/shared/data/utils'
import { useOptionalBible } from '../WorldBible'
import { extractEntitiesFromPlan } from '@/domains/storyteller/core/entities/entity-extractor'
import {
  RICH_TEXT_EMPTY_PLACEHOLDER,
  RichTextContainerTag,
} from '@/domains/storyteller/ui/RichText/constants/rich-text'
import { useStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'

interface RichTextProps {
  /** Text content (may contain entity references) */
  text: string | null | undefined
  /** Project ID for entity resolution (optional - can use context) */
  projectId?: string
  /** Additional className */
  className?: string
  /** Render as inline or block element */
  inline?: boolean
  /** Callback when an entity is clicked */
  onEntityClick?: (refId: string, entity: EntityReference | null) => void
  /** Fallback when text is empty */
  fallback?: React.ReactNode
  /** Whether to show as italic placeholder when empty */
  showPlaceholder?: boolean
  /** Placeholder text when empty */
  placeholder?: string
}

/**
 * Simple rich text renderer with entity reference support.
 * If the text contains references [Name][id], they will be rendered
 * as interactive chips with tooltips. Otherwise, renders plain text.
 */
export const RichText: React.FC<RichTextProps> = ({
  text,
  projectId,
  className,
  inline = false,
  onEntityClick,
  fallback,
  showPlaceholder = false,
  placeholder = RICH_TEXT_EMPTY_PLACEHOLDER,
}) => {
  // Call all hooks unconditionally (before any early returns)
  const containsReferences = hasReferences(text ?? '')
  const bibleContext = useOptionalBible()
  const safeBible = bibleContext ?? { storyPlan: null }
  const navigateToEntity = useStorytellerUiStore(state => state.navigateToEntity)
  const initialEntities = useMemo(() => {
    if (!containsReferences || !safeBible.storyPlan || !projectId) return undefined
    return extractEntitiesFromPlan(safeBible.storyPlan, projectId)
  }, [containsReferences, safeBible.storyPlan, projectId])

  // Handle empty/null text
  if (!text || text.trim() === '') {
    if (fallback) return <>{fallback}</>
    if (showPlaceholder) {
      return <span className={cn('text-muted-foreground italic', className)}>{placeholder}</span>
    }
    return null
  }

  // If no references, render plain text
  if (!containsReferences) {
    const Container = inline ? RichTextContainerTag.Span : RichTextContainerTag.Div
    return <Container className={cn('whitespace-pre-wrap', className)}>{text}</Container>
  }

  // Default entity click: navigate to Relationships tab with entity focused
  const defaultEntityClick = (refId: string, entity: EntityReference | null) => {
    if (onEntityClick) {
      onEntityClick(refId, entity)
      return
    }
    // Navigate to relationships tab with entity selected
    navigateToEntity({
      refId,
      entityName: entity?.name || refId,
      entityType: entity?.type,
    })
  }

  // Render with reference support
  return (
    <ReferenceText
      text={text}
      projectId={projectId}
      className={className}
      inline={inline}
      onEntityClick={defaultEntityClick}
      initialEntities={initialEntities}
    />
  )
}
