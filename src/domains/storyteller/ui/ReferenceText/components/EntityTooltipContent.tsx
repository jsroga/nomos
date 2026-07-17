import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/shared/data/utils'
import { ParsedReference } from '@/domains/storyteller/core/entities/reference-parser'
import type { EntityType as ParsedEntityType } from '@/domains/storyteller/core/entities/constants/reference-parser'
import { EntityReference } from '@/domains/storyteller/core/entities/entity-references'
import {
  ENTITY_COLORS,
  ENTITY_ICONS,
  REFERENCE_TEXT_DEFAULT_COLOR,
  REFERENCE_TEXT_DEFAULT_ENTITY_TYPE,
  REFERENCE_TEXT_DEFAULT_ICON,
  ReferenceTextTooltipCopy,
} from '../constants/reference-text-display'
import { buildDisplayMeta, synthesizeEntityDescription } from '../utils/entity-tooltip-meta'
import { EntityRelationships } from './EntityRelationships'
import { ReferenceText } from '../ReferenceText'

interface EntityTooltipContentProps {
  parsedRef: ParsedReference
  entity: EntityReference | null
  isLoading: boolean
  type: ParsedEntityType
  Icon: React.ComponentType<{ size?: number; className?: string }>
}

function LoadingTooltip() {
  return (
    <div className="flex items-center gap-2">
      <Loader2 className="h-3 w-3 animate-spin" />
      <span>{ReferenceTextTooltipCopy.Loading}</span>
    </div>
  )
}

function MissingEntityTooltip({
  parsedRef,
  type,
  Icon,
}: {
  parsedRef: ParsedReference
  type: ParsedEntityType
  Icon: React.ComponentType<{ size?: number; className?: string }>
}) {
  return (
    <div className="max-w-xs">
      <div className="font-medium flex items-center gap-2">
        <Icon size={14} className={ENTITY_COLORS[type]?.split(' ')[0]} />
        {parsedRef.displayName}
      </div>
      <div className="text-xs opacity-70 capitalize mt-1">{type}</div>
      <div className="text-[10px] opacity-40 mt-1 font-mono">{parsedRef.refId}</div>
    </div>
  )
}

function ContextualSummaryBlock({
  entity,
  description,
}: {
  entity: EntityReference
  description: string | null
}) {
  if (!entity.contextualSummary) return null

  return (
    <div
      className={cn(
        'mt-2',
        description ? 'p-2 bg-zinc-800/50 rounded border border-zinc-700/50' : 'opacity-90 leading-relaxed'
      )}
    >
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
  )
}

function BaseDescriptionBlock({
  entity,
  description,
}: {
  entity: EntityReference
  description: string | null
}) {
  if (!description || entity.contextualSummary) return null

  return (
    <div className="text-xs mt-2 opacity-90 leading-relaxed">
      <ReferenceText text={description} projectId={entity.projectId} className="inline" inline={true} />
    </div>
  )
}

function DisplayMetaBlock({ items }: { items: Array<{ label: string; value: string }> }) {
  if (items.length === 0) return null

  return (
    <div className="mt-2 pt-2 border-t border-zinc-700 space-y-1">
      {items.slice(0, 3).map((item, idx) => (
        <div key={idx} className="text-xs">
          <span className="opacity-50">{item.label}:</span>{' '}
          <span className="opacity-90">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

function ResolvedEntityTooltip({
  entity,
  parsedRef,
  type,
  Icon,
}: {
  entity: EntityReference
  parsedRef: ParsedReference
  type: ParsedEntityType
  Icon: React.ComponentType<{ size?: number; className?: string }>
}) {
  const description = synthesizeEntityDescription(entity)
  const displayMeta = buildDisplayMeta(entity, description)

  return (
    <div className="max-w-sm">
      <div className="font-medium flex items-center gap-2">
        <Icon size={14} className={ENTITY_COLORS[type]?.split(' ')[0]} />
        {entity.name}
      </div>
      <div className="text-xs opacity-70 capitalize mt-0.5">{entity.type}</div>
      <ContextualSummaryBlock entity={entity} description={description} />
      <BaseDescriptionBlock entity={entity} description={description} />
      <DisplayMetaBlock items={displayMeta} />
      <EntityRelationships entity={entity} />
      <div className="text-[10px] opacity-40 mt-2 font-mono">{parsedRef.refId}</div>
    </div>
  )
}

export function EntityTooltipContent({
  parsedRef,
  entity,
  isLoading,
  type,
  Icon,
}: EntityTooltipContentProps) {
  if (isLoading) return <LoadingTooltip />
  if (!entity) return <MissingEntityTooltip parsedRef={parsedRef} type={type} Icon={Icon} />
  return <ResolvedEntityTooltip entity={entity} parsedRef={parsedRef} type={type} Icon={Icon} />
}

export function resolveEntityChipVisuals(parsedRef: ParsedReference) {
  const type: ParsedEntityType = parsedRef.type ?? REFERENCE_TEXT_DEFAULT_ENTITY_TYPE
  const Icon = ENTITY_ICONS[type] || REFERENCE_TEXT_DEFAULT_ICON
  const colorClass = ENTITY_COLORS[type] || REFERENCE_TEXT_DEFAULT_COLOR
  return { type, Icon, colorClass }
}
