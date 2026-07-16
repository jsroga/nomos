import { db } from '@/db/client'
import { sql } from 'drizzle-orm'
import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'
import {
  EmbeddingSimilaritySqlColumn,
  RelationshipEdgeLabel,
  RelationshipsApiLog,
  RELATIONSHIP_EDGE_DEFAULT_TYPE,
} from '@/domains/storyteller/core/io/constants/relationships-api'
import { readRowNumber, readRowString, sqlResultRows } from '@/shared/data/json-guards'
import type { DbEntityRow } from './fetch-project-data'
import { addEdge, type GraphEdge } from './graph-types'

function embeddingEdgeLabel(
  sourceType: string,
  targetType: string
): { relType: string; label: string } {
  const isCharacterFactionPair =
    (sourceType === StoryEntityType.Character && targetType === StoryEntityType.Faction) ||
    (sourceType === StoryEntityType.Faction && targetType === StoryEntityType.Character)

  if (isCharacterFactionPair) {
    return { relType: RELATIONSHIP_EDGE_DEFAULT_TYPE, label: RelationshipEdgeLabel.Affiliated }
  }

  if (sourceType === StoryEntityType.Place || targetType === StoryEntityType.Place) {
    return { relType: RELATIONSHIP_EDGE_DEFAULT_TYPE, label: RelationshipEdgeLabel.LocatedIn }
  }

  return { relType: RELATIONSHIP_EDGE_DEFAULT_TYPE, label: RelationshipEdgeLabel.Connected }
}

export async function addEmbeddingSimilarityEdges(params: {
  projectId: string
  dbEntities: DbEntityRow[]
  edges: GraphEdge[]
  edgeIds: Set<string>
}): Promise<void> {
  const entitiesWithEmbeddings = params.dbEntities.filter(e => e.hasEmbedding)
  if (entitiesWithEmbeddings.length < 2) return

  try {
    const pairwiseResult = await db.execute(sql`
      SELECT 
        a.id as source_id,
        b.id as target_id,
        a.name as source_name,
        b.name as target_name,
        a.type as source_type,
        b.type as target_type,
        1 - (a.embedding <=> b.embedding) as similarity
      FROM entity_references a
      CROSS JOIN entity_references b
      WHERE a.project_id = ${params.projectId}
        AND b.project_id = ${params.projectId}
        AND a.id < b.id
        AND a.embedding IS NOT NULL
        AND b.embedding IS NOT NULL
        AND 1 - (a.embedding <=> b.embedding) > 0.55
      ORDER BY similarity DESC
      LIMIT 50
    `)

    for (const row of sqlResultRows(pairwiseResult)) {
      const sourceType = readRowString(row, EmbeddingSimilaritySqlColumn.SourceType) ?? ''
      const targetType = readRowString(row, EmbeddingSimilaritySqlColumn.TargetType) ?? ''
      const similarity = readRowNumber(row, EmbeddingSimilaritySqlColumn.Similarity) ?? 0
      const sourceId = readRowString(row, EmbeddingSimilaritySqlColumn.SourceId)
      const targetId = readRowString(row, EmbeddingSimilaritySqlColumn.TargetId)
      if (!sourceId || !targetId) continue

      const key = [sourceId, targetId].sort().join('|')
      if (params.edgeIds.has(key)) continue

      const { relType, label } = embeddingEdgeLabel(sourceType, targetType)
      addEdge(params.edges, params.edgeIds, sourceId, targetId, similarity, relType, label)
    }

    console.log(
      `[Relationships] Embedding similarity: added supplemental edges, total now ${params.edges.length}`
    )
  } catch (err) {
    console.warn(RelationshipsApiLog.EmbeddingSimilarityFailed, err)
  }
}
