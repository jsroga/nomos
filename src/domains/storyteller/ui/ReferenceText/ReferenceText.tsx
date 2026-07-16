'use client'

/* eslint-disable react-hooks/refs -- tooltip content reads ref in useMemo by design */
/**
 * ReferenceText Component
 *
 * Renders text containing entity references [Name][id] with:
 * - Hover tooltips showing entity details
 * - Clickable links for navigation
 * - Visual styling based on entity type
 * - Alt-key sticky tooltips (like Crusader Kings 3)
 *
 * Usage:
 * <ReferenceText
 *   text="[Marcus][char-001] went to [The Citadel][place-002]"
 *   onEntityClick={(refId) => openEntityPanel(refId)}
 * />
 */

import React, { useMemo, useState, useEffect } from 'react'
import { z } from 'zod'
import { useEntities } from '@/domains/storyteller/state/queries/useEntity'
import { cn } from '@/shared/data/utils'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import {
  splitIntoSegments,
  ParsedReference,
  TextSegment,
  stripReferences,
  PREFIX_TO_TYPE,
} from '@/domains/storyteller/core/entities/reference-parser'
import {
  EntityReference,
  EntityRelationship,
  EntityType,
} from '@/domains/storyteller/core/entities/entity-references'
import {
  DOM_EVENT_KEYDOWN,
  ENTITY_COLORS,
  ENTITY_ICONS,
  REFERENCE_TEXT_DEFAULT_COLOR,
  REFERENCE_TEXT_DEFAULT_ENTITY_TYPE,
  REFERENCE_TEXT_DEFAULT_ICON,
  REFERENCE_TEXT_DEFAULT_RELATIONSHIP_TYPE,
  REFERENCE_TEXT_DOM_EVENT_KEYUP,
  ReferenceSegmentType,
  ReferenceTextKeyboardKey,
  ReferenceTextMetaLabel,
  ReferenceTextTooltipCopy,
  ReferenceTextFallbackColor,
  RELATIONSHIP_TYPE_PLURAL_LABELS,
  RichTextContainerTag,
  StoryEntityType,
  StorytellerTextSeparator,
} from './constants/reference-text-display'
import { markEntityReferenced } from '@/domains/storyteller/core/io/entities.api'
import { Users, Loader2 } from 'lucide-react'

export type { EntityReference, EntityRelationship, EntityType }

// Global Alt-key state for sticky tooltips
let isAltKeyDown = false
if (typeof window !== 'undefined') {
  window.addEventListener(DOM_EVENT_KEYDOWN, e => {
    if (e.key === ReferenceTextKeyboardKey.Alt) isAltKeyDown = true
  })
  window.addEventListener(REFERENCE_TEXT_DOM_EVENT_KEYUP, e => {
    if (e.key === ReferenceTextKeyboardKey.Alt) isAltKeyDown = false
  })
}

/**
 * Loose typed view over `entity.metadata` (Record<string, unknown>) for the
 * tooltip synthesis below — the fields various generators may have written.
 */
const optionalString = z.string().optional().catch(undefined)
const optionalStringArray = z.array(z.string()).optional().catch(undefined)

const tooltipMetaSchema = z.object({
  role: optionalString,
  shortDescription: optionalString,
  archetype: optionalString,
  motivation: optionalString,
  fatalFlaw: optionalString,
  traits: optionalStringArray,
  description: optionalString,
  ideology: optionalString,
  powerStructure: optionalString,
  politicalForces: optionalString,
  goals: optionalStringArray,
  resources: optionalString,
  weaknesses: optionalString,
  atmosphere: optionalString,
  significance: optionalString,
  impact: optionalString,
  date: optionalString,
  rule: optionalString,
  consequence: optionalString,
  logline: optionalString,
  action: optionalString,
})

type TooltipMeta = z.infer<typeof tooltipMetaSchema>

function tooltipMetaFrom(metadata: unknown): TooltipMeta {
  const parsed = tooltipMetaSchema.safeParse(metadata ?? {})
  return parsed.success ? parsed.data : {}
}

interface ReferenceTextProps {
  /** Text containing entity references */
  text: string
  /** Callback when an entity is clicked */
  onEntityClick?: (refId: string, entity: EntityReference | null) => void
  /** Project ID for entity resolution */
  projectId?: string
  /** Additional className for the container */
  className?: string
  /** Render text as inline or block */
  inline?: boolean
  /** Custom renderer for plain text segments */
  renderText?: (text: string, index: number) => React.ReactNode
  /** Pre-loaded entities to use before/instead of fetching */
  initialEntities?: Map<string, EntityReference>
}

interface EntityChipProps {
  ref: ParsedReference
  entity: EntityReference | null
  isLoading: boolean
  onClick?: (refId: string, entity: EntityReference | null) => void
}

/**
 * Sticky Tooltip - stays open when Alt is held (like Crusader Kings 3)
 * Allows mouse to move into tooltip content for nested interactions
 */
const StickyTooltip: React.FC<{
  children: React.ReactNode
  content: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}> = ({ children, content, open: controlledOpen, onOpenChange }) => {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isHoveringContent, setIsHoveringContent] = useState(false)
  // Initialize from global state to catch "already held" case
  const [isAltHeld, setIsAltHeld] = useState(isAltKeyDown)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const isOpen = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  // Track Alt key state
  useEffect(() => {
    // Sync with global state immediately
    setIsAltHeld(isAltKeyDown)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ReferenceTextKeyboardKey.Alt) setIsAltHeld(true)
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ReferenceTextKeyboardKey.Alt) {
        setIsAltHeld(false)
      }
    }
    window.addEventListener(DOM_EVENT_KEYDOWN, handleKeyDown)
    window.addEventListener(REFERENCE_TEXT_DOM_EVENT_KEYUP, handleKeyUp)
    return () => {
      window.removeEventListener(DOM_EVENT_KEYDOWN, handleKeyDown)
      window.removeEventListener(REFERENCE_TEXT_DOM_EVENT_KEYUP, handleKeyUp)
    }
  }, []) // Empty dependency to set up once. The state setter is stable.

  // Effect to close when Alt is released and not hovering
  useEffect(() => {
    if (!isAltHeld && !isHoveringContent && isOpen) {
      // If we just released Alt and are not hovering content, close it.
      // But we need to be careful not to close purely on hover-out of trigger (handled by handleTriggerLeave)
      // This effect handles the "Release Alt while outside" case.
      setOpen(false)
    }
  }, [isAltHeld, isHoveringContent]) // Re-run when these change

  const handleTriggerEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setOpen(true)
  }
  // We need refs for the timeout callback to see latest state
  const isHoveringContentRef = React.useRef(isHoveringContent)
  const isAltHeldRef = React.useRef(isAltHeld)

  useEffect(() => {
    isHoveringContentRef.current = isHoveringContent
    isAltHeldRef.current = isAltHeld
  }, [isHoveringContent, isAltHeld])

  const handleTriggerLeaveFixed = () => {
    if (isAltHeldRef.current) return

    timeoutRef.current = setTimeout(() => {
      if (!isHoveringContentRef.current && !isAltHeldRef.current) {
        setOpen(false)
      }
    }, 300)
  }

  const handleContentEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsHoveringContent(true)
  }

  const handleContentLeave = () => {
    setIsHoveringContent(false)
    // If Alt is not held, close immediately-ish
    if (!isAltHeld) {
      setOpen(false)
    }
  }

  return (
    <TooltipPrimitive.Root open={isOpen}>
      <TooltipPrimitive.Trigger asChild>
        <span
          onMouseEnter={handleTriggerEnter}
          onMouseLeave={handleTriggerLeaveFixed}
          className="cursor-pointer" // Ensure it looks interactive
        >
          {children}
        </span>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="top"
          sideOffset={5}
          onMouseEnter={handleContentEnter}
          onMouseLeave={handleContentLeave}
          className={cn(
            'z-[200] overflow-hidden rounded-lg bg-zinc-900 border border-zinc-700 shadow-xl',
            'px-3 py-2 text-sm text-zinc-100',
            'animate-in fade-in-0 zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
            'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
            'pointer-events-auto' // Explicitly allow pointer events
          )}
        >
          {content}
          {isAltHeld && (
            <div className="mt-2 pt-2 border-t border-zinc-700 text-[10px] text-zinc-500 flex items-center gap-1">
              <span className="bg-zinc-800 px-1 rounded">Option/Alt</span>
              <span>held - tooltip frozen</span>
            </div>
          )}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

/**
 * Individual entity chip with sticky tooltip
 */
const EntityChip: React.FC<EntityChipProps> = ({ ref, entity, isLoading, onClick }) => {
  const type = ref.type || REFERENCE_TEXT_DEFAULT_ENTITY_TYPE
  const Icon = ENTITY_ICONS[type] || REFERENCE_TEXT_DEFAULT_ICON
  const colorClass = ENTITY_COLORS[type] || REFERENCE_TEXT_DEFAULT_COLOR

  const tooltipContent = useMemo(() => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{ReferenceTextTooltipCopy.Loading}</span>
        </div>
      )
    }

    if (!entity) {
      return (
        <div className="max-w-xs">
          <div className="font-medium flex items-center gap-2">
            <Icon size={14} className={ENTITY_COLORS[type]?.split(' ')[0]} />
            {ref.displayName}
          </div>
          <div className="text-xs opacity-70 capitalize mt-1">{type}</div>
          <div className="text-[10px] opacity-40 mt-1 font-mono">{ref.refId}</div>
        </div>
      )
    }

    // Synthesize description from available data if description is empty
    const synthesizeDescription = (): string | null => {
      if (entity.description && entity.description.trim()) {
        return entity.description
      }

      const meta = tooltipMetaFrom(entity.metadata)
      const parts: string[] = []

      // For characters
      if (entity.type === StoryEntityType.Character) {
        if (meta.role) parts.push(meta.role)
        if (meta.shortDescription) parts.push(meta.shortDescription)
        if (meta.archetype) parts.push(`${ReferenceTextTooltipCopy.ArchetypePrefix} ${meta.archetype}`)
        if (meta.motivation) parts.push(`${ReferenceTextTooltipCopy.MotivationPrefix} ${meta.motivation}`)
        if (meta.fatalFlaw) parts.push(`${ReferenceTextTooltipCopy.FatalFlawPrefix} ${meta.fatalFlaw}`)
        if (meta.traits && Array.isArray(meta.traits)) {
          parts.push(`${ReferenceTextTooltipCopy.TraitsPrefix} ${meta.traits.slice(0, 3).join(StorytellerTextSeparator.CommaSpace)}`)
        }
      }

      if (entity.type === StoryEntityType.Faction) {
        // Primary description field
        if (meta.description) parts.push(meta.description)
        if (meta.ideology && !meta.description) parts.push(meta.ideology)

        // Power structure
        if (meta.powerStructure) parts.push(meta.powerStructure)

        // Political forces
        if (meta.politicalForces) parts.push(meta.politicalForces)

        // Legacy fields
        if (meta.goals && Array.isArray(meta.goals)) {
          parts.push(`${ReferenceTextTooltipCopy.GoalsPrefix} ${meta.goals.slice(0, 2).join(StorytellerTextSeparator.CommaSpace)}`)
        }
        if (meta.resources) parts.push(`${ReferenceTextTooltipCopy.ResourcesPrefix} ${meta.resources}`)
      }

      if (entity.type === StoryEntityType.Place) {
        if (meta.description) parts.push(meta.description)
        if (meta.atmosphere) parts.push(meta.atmosphere)
        if (meta.significance) parts.push(meta.significance)
      }

      // For events
      if (entity.type === StoryEntityType.Event) {
        if (meta.description) parts.push(meta.description)
        if (meta.impact) parts.push(`${ReferenceTextTooltipCopy.ImpactPrefix} ${meta.impact}`)
        if (meta.date) parts.push(`${ReferenceTextTooltipCopy.DatePrefix} ${meta.date}`)
      }

      if (entity.type === StoryEntityType.Rule) {
        if (meta.rule) parts.push(meta.rule)
        if (meta.consequence) parts.push(`${ReferenceTextTooltipCopy.ConsequencePrefix} ${meta.consequence}`)
      }

      if (entity.type === StoryEntityType.Beat) {
        if (meta.logline) parts.push(meta.logline)
        if (meta.action) parts.push(meta.action)
      }

      return parts.length > 0 ? parts.slice(0, 3).join(StorytellerTextSeparator.PeriodSpace) + '.' : null
    }

    const description = synthesizeDescription()

    // Get additional metadata to display
    const displayMeta: Array<{ label: string; value: string }> = []
    const meta = tooltipMetaFrom(entity.metadata)

    if (entity.type === StoryEntityType.Character) {
      if (meta.role && !description?.includes(meta.role)) {
        displayMeta.push({ label: ReferenceTextMetaLabel.Role, value: meta.role })
      }
      if (meta.motivation && !description?.includes(meta.motivation)) {
        displayMeta.push({ label: ReferenceTextMetaLabel.Motivation, value: meta.motivation })
      }
      if (meta.fatalFlaw && !description?.includes(meta.fatalFlaw)) {
        displayMeta.push({ label: ReferenceTextMetaLabel.FatalFlaw, value: meta.fatalFlaw })
      }
    }

    if (entity.type === StoryEntityType.Faction) {
      // Show powerStructure if not already in description
      if (meta.powerStructure && !description?.includes(meta.powerStructure)) {
        displayMeta.push({ label: ReferenceTextMetaLabel.Power, value: meta.powerStructure.slice(0, 150) })
      }
      if (meta.politicalForces && !description?.includes(meta.politicalForces)) {
        displayMeta.push({ label: ReferenceTextMetaLabel.Politics, value: meta.politicalForces.slice(0, 150) })
      }
      if (meta.resources && !description?.includes(meta.resources)) {
        displayMeta.push({ label: ReferenceTextMetaLabel.Resources, value: meta.resources })
      }
      if (meta.goals && Array.isArray(meta.goals) && meta.goals.length > 0) {
        displayMeta.push({
          label: ReferenceTextMetaLabel.Goals,
          value: meta.goals.slice(0, 2).join(StorytellerTextSeparator.CommaSpace),
        })
      }
      if (meta.weaknesses) {
        displayMeta.push({ label: ReferenceTextMetaLabel.Weakness, value: meta.weaknesses })
      }
    }

    // Render relationship chips (nested entity references in tooltip)
    const renderRelationships = () => {
      if (!entity.relationships || entity.relationships.length === 0) return null

      // Group by relationship type
      const grouped = new Map<string, EntityRelationship[]>()
      for (const rel of entity.relationships) {
        const relType = rel.relationshipType || REFERENCE_TEXT_DEFAULT_RELATIONSHIP_TYPE
        const bucket = grouped.get(relType)
        if (bucket) {
          bucket.push(rel)
        } else {
          grouped.set(relType, [rel])
        }
      }

      return (
        <div className="mt-2 pt-2 border-t border-zinc-700">
          <div className="text-[10px] opacity-50 uppercase tracking-wide mb-1 flex items-center gap-1">
            <Users size={10} />
            {ReferenceTextTooltipCopy.Relationships}
          </div>
          <div className="space-y-1.5">
            {Array.from(grouped.entries())
              .slice(0, 4)
              .map(([relType, rels]) => (
                <div key={relType} className="text-xs">
                  <span className="opacity-50 text-[10px]">
                    {RELATIONSHIP_TYPE_PLURAL_LABELS[relType] || relType}:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {rels.slice(0, 3).map((rel, idx) => {
                      // Use targetType if available, otherwise infer from targetId
                      const relEntityType =
                        rel.targetType || PREFIX_TO_TYPE[rel.targetId.split('-')[0]]
                      const RelIcon =
                        (relEntityType && ENTITY_ICONS[relEntityType]) || REFERENCE_TEXT_DEFAULT_ICON
                      const relColor =
                        (relEntityType && ENTITY_COLORS[relEntityType])?.split(' ')[0] ||
                        ReferenceTextFallbackColor.Gray

                      return (
                        <span
                          key={idx}
                          className={cn(
                            'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded',
                            'bg-zinc-800 hover:bg-zinc-700 cursor-pointer transition-colors',
                            'border border-zinc-700/50',
                            relColor
                          )}
                          title={rel.description || `View ${rel.targetName}`}
                        >
                          <RelIcon size={10} />
                          <span className="text-[10px]">{stripReferences(rel.targetName)}</span>
                          {rel.strength > 0.8 && <span className="text-[8px] opacity-50">★</span>}
                        </span>
                      )
                    })}
                    {rels.length > 3 && (
                      <span className="text-[10px] opacity-40 self-center">+{rels.length - 3}</span>
                    )}
                  </div>
                </div>
              ))}
          </div>
          {entity.relationshipSummary && (
            <div className="mt-2 text-[10px] opacity-60 italic">
              {stripReferences(entity.relationshipSummary).length > 100
                ? stripReferences(entity.relationshipSummary).slice(0, 100) + '...'
                : stripReferences(entity.relationshipSummary)}
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="max-w-sm">
        <div className="font-medium flex items-center gap-2">
          <Icon size={14} className={ENTITY_COLORS[type]?.split(' ')[0]} />
          {entity.name}
        </div>
        <div className="text-xs opacity-70 capitalize mt-0.5">{entity.type}</div>

        {/* AI-Generated Summary behavior depends on if we have a base description */}
        {entity.contextualSummary && (
          <div className={cn('mt-2', description ? 'p-2 bg-zinc-800/50 rounded border border-zinc-700/50' : 'opacity-90 leading-relaxed')}>
            {description && (
              <div className="text-[10px] opacity-50 uppercase tracking-wide mb-1 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                {ReferenceTextTooltipCopy.InThisContext}
              </div>
            )}
            <div className={cn('text-xs opacity-90 leading-relaxed', description && 'italic')}>
              {entity.contextualSummary}
            </div>
          </div>
        )}

        {/* Base description - only show if no contextual summary or as additional info */}
        {description && !entity.contextualSummary && (
          <div className="text-xs mt-2 opacity-90 leading-relaxed">
            <ReferenceText
              text={description}
              projectId={entity.projectId}
              className="inline"
              inline={true}
            />
          </div>
        )}

        {displayMeta.length > 0 && (
          <div className="mt-2 pt-2 border-t border-zinc-700 space-y-1">
            {displayMeta.slice(0, 3).map((item, idx) => (
              <div key={idx} className="text-xs">
                <span className="opacity-50">{item.label}:</span>{' '}
                <span className="opacity-90">{item.value}</span>
              </div>
            ))}
          </div>
        )}
        {renderRelationships()}
        <div className="text-[10px] opacity-40 mt-2 font-mono">{ref.refId}</div>
      </div>
    )
  }, [entity, isLoading, ref, type, Icon])

  return (
    <StickyTooltip content={tooltipContent}>
      <button
        type="button"
        onClick={() => onClick?.(ref.refId, entity)}
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md',
          'transition-colors duration-150 cursor-pointer',
          'text-sm font-medium',
          colorClass
        )}
      >
        <Icon size={12} className="shrink-0" />
        <span>{ref.displayName}</span>
      </button>
    </StickyTooltip>
  )
}

/**
 * Main ReferenceText component
 */

export const ReferenceText: React.FC<ReferenceTextProps> = ({
  text,
  onEntityClick,
  projectId,
  className,
  inline = true,
  renderText,
  initialEntities,
}) => {
  // Use derived state from props + queries, no local state needed for caching anymore

  // Parse text into segments
  const segments = useMemo(() => splitIntoSegments(text), [text])

  // Extract reference IDs that need resolution
  const refIds = useMemo(() => {
    return segments
      .filter(
        (s): s is TextSegment & { type: ReferenceSegmentType.Reference } =>
          s.type === ReferenceSegmentType.Reference
      )
      .map(s => s.ref.refId)
  }, [segments])

  // Resolve entities using React Query batching
  const queryResults = useEntities(refIds, projectId)
  const loadingIds = useMemo(() => {
    const set = new Set<string>()
    queryResults.forEach((r, i) => {
      if (r.isLoading) set.add(refIds[i])
    })
    return set
  }, [queryResults, refIds])

  // Let's simplify: Derived state only.
  const finalEntities = useMemo(() => {
    const map = new Map(initialEntities || [])
    queryResults.forEach((result, index) => {
      if (result.data) {
        map.set(refIds[index], result.data)
      }
    })
    return map
  }, [initialEntities, queryResults, refIds])

  // Handle entity click
  const handleEntityClick = (refId: string, entity: EntityReference | null) => {
    // Mark as referenced via API (fire and forget)
    if (projectId) {
      void markEntityReferenced(projectId, refId).catch(() => {})
    }
    onEntityClick?.(refId, entity)
  }

  // Render segments
  const renderedContent = segments.map((segment, index) => {
    if (segment.type === ReferenceSegmentType.Text) {
      if (renderText) {
        return <React.Fragment key={index}>{renderText(segment.content, index)}</React.Fragment>
      }
      return <span key={index}>{segment.content}</span>
    }

    // Reference segment
    const entity = finalEntities.get(segment.ref.refId) || null
    const isLoading = loadingIds.has(segment.ref.refId)

    return (
      <EntityChip
        key={`${segment.ref.refId}-${index}`}
        ref={segment.ref}
        entity={entity}
        isLoading={isLoading}
        onClick={handleEntityClick}
      />
    )
  })

  const Container = inline ? RichTextContainerTag.Span : RichTextContainerTag.Div

  return <Container className={cn('whitespace-pre-wrap', className)}>{renderedContent}</Container>
}
