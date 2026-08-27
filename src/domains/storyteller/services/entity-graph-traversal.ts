import { entityReferences } from '@/db'
import { db } from '@/db/client'
import { eq, and, sql, inArray, desc } from 'drizzle-orm'
import { SqlResultColumn } from '@/shared/data/constants/protocol'
import { readRowNumber, readRowString, sqlResultRows } from '@/shared/data/json-guards'
import { parseEntityType } from '@/domains/storyteller/core/entities/entity-type-guards'
import { EntityGraphLog } from '@/domains/storyteller/services/constants/entity-graph-log'
import { InferredRelationshipType } from '@/domains/storyteller/services/constants/entity-graph-wire'
import type { ProjectScope } from '@/shared/auth/project-scope'
import type { EntityType } from './entity-registry-service'
import { vectorSql, HOP_DECAY_FACTOR, MIN_RELEVANCE_THRESHOLD } from './entity-graph-vector'
import {
  scoredEntityFromRow,
  type DbEntityRow,
  type GraphRAGOptions,
  type ScoredEntity,
  DEFAULT_GRAPH_RAG_OPTIONS,
} from './entity-graph-types'
import { applyRandomWalkScoring } from './entity-graph-random-walk'

export function similarityFromSqlResult(result: unknown): number {
  const row = sqlResultRows(result)[0]
  return readRowNumber(row ?? {}, SqlResultColumn.Similarity) ?? 0
}

async function querySimilarEntities(
  source: DbEntityRow,
  projectId: string,
  opts: Required<GraphRAGOptions>,
  hop: number
): Promise<DbEntityRow[]> {
  if (!source.embedding) return []

  const vecFragment = vectorSql(source.embedding)
  return db
    .select({
      id: entityReferences.id,
      name: entityReferences.name,
      type: entityReferences.type,
      description: entityReferences.description,
      metadata: entityReferences.metadata,
      projectId: entityReferences.projectId,
      sourceEntityId: entityReferences.sourceEntityId,
      createdAt: entityReferences.createdAt,
      lastReferencedAt: entityReferences.lastReferencedAt,
      embedding: entityReferences.embedding,
      similarity: sql<number>`1 - (${entityReferences.embedding} <=> ${vecFragment})`,
    })
    .from(entityReferences)
    .where(
      and(
        eq(entityReferences.projectId, projectId),
        sql`${entityReferences.id} != ${source.id}`,
        sql`${entityReferences.embedding} IS NOT NULL`,
        opts.types.length > 0 ? inArray(entityReferences.type, opts.types) : sql`TRUE`
      )
    )
    .orderBy(desc(sql`1 - (${entityReferences.embedding} <=> ${vecFragment})`))
    .limit(Math.ceil(opts.maxResults / hop))
}

function registerHopEntity(
  entity: DbEntityRow,
  hop: number,
  sourceId: string,
  decayMultiplier: number,
  threshold: number,
  discovered: Map<string, ScoredEntity>,
  seedSet: Set<string>,
  nextHopEntities: DbEntityRow[]
): void {
  const similarity = entity.similarity ?? 0
  if (similarity < threshold) return

  const relevance = similarity * decayMultiplier
  if (relevance < MIN_RELEVANCE_THRESHOLD) return

  const existing = discovered.get(entity.id)
  if (existing && relevance <= existing.relevance) return

  const scored = scoredEntityFromRow(entity, {
    relevance,
    hopDistance: hop,
    discoveredVia: sourceId,
  })
  if (!scored) return

  discovered.set(entity.id, scored)

  if (!seedSet.has(entity.id) && entity.embedding) {
    nextHopEntities.push(entity)
  }
}

export async function traverseRelatedEntities(
  seedIds: string[],
  scope: ProjectScope,
  options: GraphRAGOptions = {}
): Promise<ScoredEntity[]> {
  const { projectId } = scope
  const opts = { ...DEFAULT_GRAPH_RAG_OPTIONS, ...options }

  if (seedIds.length === 0) return []

  try {
    const discovered = new Map<string, ScoredEntity>()
    const seedSet = new Set(seedIds)

    const seedEntities = await db
      .select()
      .from(entityReferences)
      .where(and(eq(entityReferences.projectId, projectId), inArray(entityReferences.id, seedIds)))

    for (const seed of seedEntities) {
      const scored = scoredEntityFromRow(seed, { relevance: 1.0, hopDistance: 0 })
      if (scored) discovered.set(seed.id, scored)
    }

    let currentHopEntities: DbEntityRow[] = seedEntities.filter(e => e.embedding)

    for (let hop = 1; hop <= opts.maxDepth; hop++) {
      const nextHopEntities: DbEntityRow[] = []
      const decayMultiplier = Math.pow(HOP_DECAY_FACTOR, hop)

      for (const source of currentHopEntities) {
        const similar = await querySimilarEntities(source, projectId, opts, hop)
        for (const entity of similar) {
          registerHopEntity(entity, hop, source.id, decayMultiplier, opts.threshold, discovered, seedSet, nextHopEntities)
        }
      }

      currentHopEntities = nextHopEntities
      if (currentHopEntities.length === 0) break
    }

    const results = Array.from(discovered.values())
    if (opts.randomWalkSteps > 0 && results.length > 1) {
      applyRandomWalkScoring(results, opts.randomWalkSteps, opts.restartProbability, seedSet)
    }

    results.sort((a, b) => {
      if (Math.abs(a.relevance - b.relevance) > 0.01) {
        return b.relevance - a.relevance
      }
      return a.hopDistance - b.hopDistance
    })

    return results.slice(0, opts.maxResults)
  } catch (err) {
    console.warn(EntityGraphLog.GraphTraversalFailed, err)
    return []
  }
}

export async function buildProjectGraphEdges(
  scope: ProjectScope,
  entities: DbEntityRow[],
  minStrength: number,
  inferType: (
    sourceType: EntityType | undefined,
    targetType: EntityType | undefined,
    weight: number
  ) => InferredRelationshipType
): Promise<Array<{ source: string; target: string; weight: number; type: InferredRelationshipType }>> {
  const { projectId } = scope
  const edges: Array<{ source: string; target: string; weight: number; type: InferredRelationshipType }> = []

  if (entities.length <= 1) return edges

  try {
    const entityIds = entities.map(e => e.id)
    const result = await db.execute(sql`
      SELECT 
        a.id as source_id, 
        b.id as target_id,
        a.type as source_type,
        b.type as target_type,
        1 - (a.embedding <=> b.embedding) as similarity
      FROM entity_references a
      JOIN entity_references b ON a.id < b.id
      WHERE a.project_id = ${projectId}
        AND b.project_id = ${projectId}
        AND a.embedding IS NOT NULL
        AND b.embedding IS NOT NULL
        AND a.id = ANY(${entityIds})
        AND b.id = ANY(${entityIds})
        AND 1 - (a.embedding <=> b.embedding) >= ${minStrength}
      ORDER BY similarity DESC
      LIMIT 200
    `)

    for (const row of sqlResultRows(result)) {
      const sourceId = readRowString(row, SqlResultColumn.SourceId)
      const targetId = readRowString(row, SqlResultColumn.TargetId)
      const sourceType = parseEntityType(readRowString(row, SqlResultColumn.SourceType))
      const targetType = parseEntityType(readRowString(row, SqlResultColumn.TargetType))
      const weight = readRowNumber(row, SqlResultColumn.Similarity) ?? 0
      if (!sourceId || !targetId || !sourceType || !targetType) continue

      edges.push({
        source: sourceId,
        target: targetId,
        weight,
        type: inferType(sourceType, targetType, weight),
      })
    }
    return edges
  } catch (queryErr) {
    console.warn(EntityGraphLog.BatchSimilarityFailed, queryErr)
    return buildProjectGraphEdgesFallback(entities, minStrength, inferType)
  }
}

async function buildProjectGraphEdgesFallback(
  entities: DbEntityRow[],
  minStrength: number,
  inferType: (
    sourceType: EntityType | undefined,
    targetType: EntityType | undefined,
    weight: number
  ) => InferredRelationshipType
): Promise<Array<{ source: string; target: string; weight: number; type: InferredRelationshipType }>> {
  const edges: Array<{ source: string; target: string; weight: number; type: InferredRelationshipType }> = []
  const limited = entities.slice(0, 20)

  for (let i = 0; i < limited.length; i++) {
    for (let j = i + 1; j < limited.length; j++) {
      const a = limited[i]
      const b = limited[j]
      if (!a.embedding || !b.embedding) continue

      try {
        const result = await db.execute(
          sql`SELECT 1 - (${vectorSql(a.embedding)} <=> ${vectorSql(b.embedding)}) as similarity`
        )
        const similarity = similarityFromSqlResult(result)
        const sourceType = parseEntityType(a.type)
        const targetType = parseEntityType(b.type)
        if (similarity >= minStrength && sourceType && targetType) {
          edges.push({
            source: a.id,
            target: b.id,
            weight: similarity,
            type: inferType(sourceType, targetType, similarity),
          })
        }
      } catch {
        /* skip pair on error */
      }
    }
  }

  return edges
}
