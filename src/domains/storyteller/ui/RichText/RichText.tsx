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
import { useOptionalBible } from '../WorldBible/components/BibleContext'
import { extractEntitiesFromPlan } from '@/domains/storyteller/core/entities/entity-extractor'
import {
  RICH_TEXT_EMPTY_PLACEHOLDER,
  RichTextContainerTag,
  RichTextWhitespaceClass,
  splitBibleParagraphs,
} from '@/domains/storyteller/ui/RichText/constants/rich-text'
import { useStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import { BibleMarkdown } from './BibleMarkdown'

interface RichTextProps {
  /** Text content (may contain entity references) */
  text: string | null | undefined
  /** Project ID for entity resolution (optional - can use context) */
  projectId?: string
  /** Additional className */
  className?: string
  /** Render as inline or block element */
  inline?: boolean
  /** Render markdown (**bold**, paragraphs) around entity chips */
  markdown?: boolean
  /** Callback when an entity is clicked */
  onEntityClick?: (refId: string, entity: EntityReference | null) => void
  /** Fallback when text is empty */
  fallback?: React.ReactNode
  /** Whether to show as italic placeholder when empty */
  showPlaceholder?: boolean
  /** Placeholder text when empty */
  placeholder?: string
}

function renderMarkdownSegment(segmentText: string) {
  return <BibleMarkdown text={segmentText} inline />
}

function RichTextEmpty({
  fallback,
  showPlaceholder,
  placeholder,
  className,
}: {
  fallback?: React.ReactNode
  showPlaceholder: boolean
  placeholder: string
  className?: string
}) {
  if (fallback) return <>{fallback}</>
  if (showPlaceholder) {
    return <span className={cn('text-muted-foreground italic', className)}>{placeholder}</span>
  }
  return null
}

function RichTextPlain({
  text,
  markdown,
  inline,
  className,
}: {
  text: string
  markdown: boolean
  inline: boolean
  className?: string
}) {
  if (markdown) {
    return <BibleMarkdown text={text} inline={inline} className={className} />
  }
  const Container = inline ? RichTextContainerTag.Span : RichTextContainerTag.Div
  return <Container className={cn(RichTextWhitespaceClass.PreWrap, className)}>{text}</Container>
}

function RichTextReferenced({
  text,
  projectId,
  className,
  inline,
  markdown,
  onEntityClick,
  initialEntities,
}: {
  text: string
  projectId?: string
  className?: string
  inline: boolean
  markdown: boolean
  onEntityClick: (refId: string, entity: EntityReference | null) => void
  initialEntities?: Map<string, EntityReference>
}) {
  const renderText = markdown ? renderMarkdownSegment : undefined
  if (markdown && !inline) {
    return (
      <div className={cn(RichTextWhitespaceClass.ParagraphStack, className)}>
        {splitBibleParagraphs(text).map((paragraph, paragraphIndex) => (
          <ReferenceText
            key={paragraphIndex}
            text={paragraph}
            projectId={projectId}
            className={RichTextWhitespaceClass.Normal}
            inline={false}
            onEntityClick={onEntityClick}
            initialEntities={initialEntities}
            renderText={renderText}
          />
        ))}
      </div>
    )
  }
  return (
    <ReferenceText
      text={text}
      projectId={projectId}
      className={cn(markdown ? RichTextWhitespaceClass.Normal : undefined, className)}
      inline={inline}
      onEntityClick={onEntityClick}
      initialEntities={initialEntities}
      renderText={renderText}
    />
  )
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
  markdown = false,
  onEntityClick,
  fallback,
  showPlaceholder = false,
  placeholder = RICH_TEXT_EMPTY_PLACEHOLDER,
}) => {
  const containsReferences = hasReferences(text ?? '')
  const bibleContext = useOptionalBible()
  const safeBible = bibleContext ?? { storyPlan: null }
  const navigateToEntity = useStorytellerUiStore(state => state.navigateToEntity)
  const initialEntities = useMemo(() => {
    if (!containsReferences || !safeBible.storyPlan || !projectId) return undefined
    return extractEntitiesFromPlan(safeBible.storyPlan, projectId)
  }, [containsReferences, safeBible.storyPlan, projectId])

  if (!text || text.trim() === '') {
    return (
      <RichTextEmpty
        fallback={fallback}
        showPlaceholder={showPlaceholder}
        placeholder={placeholder}
        className={className}
      />
    )
  }

  const handleEntityClick = (refId: string, entity: EntityReference | null) => {
    if (onEntityClick) {
      onEntityClick(refId, entity)
      return
    }
    navigateToEntity({
      refId,
      entityName: entity?.name || refId,
      entityType: entity?.type,
    })
  }

  if (!containsReferences) {
    return <RichTextPlain text={text} markdown={markdown} inline={inline} className={className} />
  }

  return (
    <RichTextReferenced
      text={text}
      projectId={projectId}
      className={className}
      inline={inline}
      markdown={markdown}
      onEntityClick={handleEntityClick}
      initialEntities={initialEntities}
    />
  )
}
