import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'
import { parseEntityType, entityMetadata } from '@/domains/storyteller/core/entities/entity-type-guards'
import { EntityRegistryNote } from '@/domains/storyteller/services/constants/entity-registry-log'
import { InferredRelationshipType } from '@/domains/storyteller/services/constants/entity-graph-wire'
import type { EntityReference, EntityType } from './entity-registry-service'

export interface ScoredEntity extends EntityReference {
  relevance: number
  hopDistance: number
  discoveredVia?: string
}

export interface GraphRAGOptions {
  threshold?: number
  maxDepth?: number
  maxResults?: number
  types?: EntityType[]
  randomWalkSteps?: number
  restartProbability?: number
  includeRelationships?: boolean
}

export const DEFAULT_GRAPH_RAG_OPTIONS: Required<GraphRAGOptions> = {
  threshold: 0.7,
  maxDepth: 2,
  maxResults: 20,
  types: [],
  randomWalkSteps: 100,
  restartProbability: 0.15,
  includeRelationships: false,
}

export const CROSS_TYPE_RELATIONSHIPS: Record<string, InferredRelationshipType> = {
  [`${StoryEntityType.Character}:${StoryEntityType.Faction}`]: InferredRelationshipType.MemberOf,
  [`${StoryEntityType.Faction}:${StoryEntityType.Character}`]: InferredRelationshipType.HasMember,
  [`${StoryEntityType.Character}:${StoryEntityType.Place}`]: InferredRelationshipType.AssociatedWith,
  [`${StoryEntityType.Character}:${StoryEntityType.Event}`]: InferredRelationshipType.InvolvedIn,
  [`${StoryEntityType.Character}:${StoryEntityType.Item}`]: InferredRelationshipType.Uses,
  [`${StoryEntityType.Faction}:${StoryEntityType.Item}`]: InferredRelationshipType.Owns,
  [`${StoryEntityType.Faction}:${StoryEntityType.Place}`]: InferredRelationshipType.Controls,
  [`${StoryEntityType.Event}:${StoryEntityType.Character}`]: InferredRelationshipType.Involves,
  [`${StoryEntityType.Event}:${StoryEntityType.Place}`]: InferredRelationshipType.OccurredAt,
  [`${StoryEntityType.Event}:${StoryEntityType.Item}`]: InferredRelationshipType.CausedBy,
  [`${StoryEntityType.Event}:${StoryEntityType.Event}`]: InferredRelationshipType.Temporal,
  [`${StoryEntityType.Item}:${StoryEntityType.Place}`]: InferredRelationshipType.LocatedIn,
}

export type DbEntityRow = {
  id: string
  name: string
  type: string
  description: string | null
  metadata: unknown
  projectId: string
  sourceEntityId?: string | null
  createdAt: Date | string
  lastReferencedAt?: Date | string | null
  embedding?: unknown
  similarity?: number
}

export function scoredEntityFromRow(
  row: DbEntityRow,
  extras: Pick<ScoredEntity, 'relevance' | 'hopDistance'> & Partial<ScoredEntity>
): ScoredEntity | null {
  const type = parseEntityType(row.type)
  if (!type) return null

  return {
    id: row.id,
    name: row.name,
    type,
    description: row.description?.startsWith(EntityRegistryNote.AutoRegistered)
      ? ''
      : (row.description || ''),
    metadata: entityMetadata(row.metadata),
    projectId: row.projectId,
    sourceEntityId: row.sourceEntityId || undefined,
    createdAt: new Date(row.createdAt),
    lastReferencedAt: new Date(row.lastReferencedAt || row.createdAt),
    ...extras,
  }
}

export function inferRelationshipType(
  sourceType: EntityType,
  targetType: EntityType,
  similarity: number
): InferredRelationshipType {
  if (sourceType === targetType) {
    if (sourceType === StoryEntityType.Character) {
      if (similarity > 0.9) return InferredRelationshipType.CloselyConnected
      if (similarity > 0.8) return InferredRelationshipType.Associated
      return InferredRelationshipType.Related
    }
    if (sourceType === StoryEntityType.Faction) return InferredRelationshipType.AlliedOrRival
    return InferredRelationshipType.Related
  }

  return CROSS_TYPE_RELATIONSHIPS[`${sourceType}:${targetType}`] ?? InferredRelationshipType.Related
}
