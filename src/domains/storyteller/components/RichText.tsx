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
import { ReferenceText } from './ReferenceText'
import { hasReferences } from '../utils/reference-parser'
import { cn } from '@/lib/utils'
import { useBible } from './WorldBible/BibleContext'
import { extractEntitiesFromPlan } from '../utils/entity-extractor'

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
  onEntityClick?: (refId: string, entity: any) => void
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
  placeholder = 'No content',
}) => {
  // Call all hooks unconditionally (before any early returns)
  const containsReferences = hasReferences(text ?? '')
  const safeBible = useSafeBible()
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
    const Container = inline ? 'span' : 'div'
    return <Container className={cn('whitespace-pre-wrap', className)}>{text}</Container>
  }

  // Default entity click: navigate to Relationships tab with entity focused
  const defaultEntityClick = (refId: string, entity: any) => {
    if (onEntityClick) {
      onEntityClick(refId, entity)
      return
    }
    // Dispatch global event to navigate to relationships tab with entity selected
    window.dispatchEvent(
      new CustomEvent('navigate-to-entity', {
        detail: { refId, entityName: entity?.name || refId, entityType: entity?.type },
      })
    )
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

// Helper to safely use Bible context without throwing
function useSafeBible() {
  try {
    return useBible()
  } catch (e) {
    return { storyPlan: null }
  }
}

/**
 * Convenience hook to get projectId from URL path
 * Works for /app/[projectId]/storyteller routes
 */
function useProjectIdFromUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined

  const path = window.location.pathname
  if (path.startsWith('/app/')) {
    return path.split('/')[2]
  }
  return path.split('/')[1]
}
