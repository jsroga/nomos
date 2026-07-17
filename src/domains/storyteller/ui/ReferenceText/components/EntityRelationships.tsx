import React from 'react'
import { Users } from 'lucide-react'
import { cn } from '@/shared/data/utils'
import { PREFIX_TO_TYPE, stripReferences } from '@/domains/storyteller/core/entities/reference-parser'
import {
  EntityReference,
  EntityRelationship,
} from '@/domains/storyteller/core/entities/entity-references'
import {
  ENTITY_COLORS,
  ENTITY_ICONS,
  REFERENCE_TEXT_DEFAULT_ICON,
  REFERENCE_TEXT_DEFAULT_RELATIONSHIP_TYPE,
  ReferenceTextFallbackColor,
  ReferenceTextTooltipCopy,
  RELATIONSHIP_TYPE_PLURAL_LABELS,
} from '../constants/reference-text-display'

function groupRelationships(relationships: EntityRelationship[]): Map<string, EntityRelationship[]> {
  const grouped = new Map<string, EntityRelationship[]>()
  for (const rel of relationships) {
    const relType = rel.relationshipType || REFERENCE_TEXT_DEFAULT_RELATIONSHIP_TYPE
    const bucket = grouped.get(relType)
    if (bucket) {
      bucket.push(rel)
    } else {
      grouped.set(relType, [rel])
    }
  }
  return grouped
}

interface RelationshipChipProps {
  rel: EntityRelationship
  index: number
}

function RelationshipChip({ rel, index }: RelationshipChipProps) {
  const relEntityType = rel.targetType || PREFIX_TO_TYPE[rel.targetId.split('-')[0]]
  const RelIcon = (relEntityType && ENTITY_ICONS[relEntityType]) || REFERENCE_TEXT_DEFAULT_ICON
  const relColor =
    (relEntityType && ENTITY_COLORS[relEntityType])?.split(' ')[0] ||
    ReferenceTextFallbackColor.Gray

  return (
    <span
      key={index}
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
}

interface RelationshipGroupProps {
  relType: string
  rels: EntityRelationship[]
}

function RelationshipGroup({ relType, rels }: RelationshipGroupProps) {
  return (
    <div className="text-xs">
      <span className="opacity-50 text-[10px]">
        {RELATIONSHIP_TYPE_PLURAL_LABELS[relType] || relType}:
      </span>
      <div className="flex flex-wrap gap-1 mt-0.5">
        {rels.slice(0, 3).map((rel, idx) => (
          <RelationshipChip key={idx} rel={rel} index={idx} />
        ))}
        {rels.length > 3 && (
          <span className="text-[10px] opacity-40 self-center">+{rels.length - 3}</span>
        )}
      </div>
    </div>
  )
}

interface EntityRelationshipsProps {
  entity: EntityReference
}

export function EntityRelationships({ entity }: EntityRelationshipsProps) {
  if (!entity.relationships || entity.relationships.length === 0) return null

  const grouped = groupRelationships(entity.relationships)
  const summary = entity.relationshipSummary ? stripReferences(entity.relationshipSummary) : null

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
            <RelationshipGroup key={relType} relType={relType} rels={rels} />
          ))}
      </div>
      {summary && (
        <div className="mt-2 text-[10px] opacity-60 italic">
          {summary.length > 100 ? summary.slice(0, 100) + '...' : summary}
        </div>
      )}
    </div>
  )
}
