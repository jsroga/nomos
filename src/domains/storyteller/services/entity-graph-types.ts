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

export function extractRelationshipsFromText(
  text: string
): Array<{
  sourceId: string
  targetId: string
  type: InferredRelationshipType
  evidence: string
}> {
  const relationships: Array<{
    sourceId: string
    targetId: string
    type: InferredRelationshipType
    evidence: string
  }> = []

  const sentences = text.split(/[.!?]+/)
  const verbPatterns = [
    { regex: /owns|possesses|has/i, type: InferredRelationshipType.Owns },
    { regex: /uses|wields|utilizes/i, type: InferredRelationshipType.Uses },
    { regex: /caused|created|triggered/i, type: InferredRelationshipType.CausedBy },
    { regex: /happened at|took place at|occurred at/i, type: InferredRelationshipType.HappenedAt },
    { regex: /located in|found in|hidden in/i, type: InferredRelationshipType.LocatedIn },
    { regex: /before|after|during/i, type: InferredRelationshipType.Temporal },
  ]

  for (const sentence of sentences) {
    const refRegex = /\[([^\]]+)\]\[([a-z]+-[a-zA-Z0-9-]+)\]/g
    let match
    const refs: Array<{ name: string; id: string; index: number }> = []

    while ((match = refRegex.exec(sentence)) !== null) {
      refs.push({ name: match[1], id: match[2], index: match.index })
    }

    if (refs.length >= 2) {
      for (let i = 0; i < refs.length - 1; i++) {
        const source = refs[i]
        const target = refs[i + 1]
        const textBetween = sentence.substring(
          source.index + source.name.length + source.id.length + 4,
          target.index
        )

        for (const pattern of verbPatterns) {
          if (pattern.regex.test(textBetween)) {
            relationships.push({
              sourceId: source.id,
              targetId: target.id,
              type: pattern.type,
              evidence: sentence.trim(),
            })
            break
          }
        }
      }
    }
  }

  return relationships
}
