/**
 * Entity Graph Service
 *
 * Provides graph-based traversal of entity relationships using embeddings.
 */

import { entityReferences } from '@/db'
import { db } from '@/db/client'
import { eq, and, sql, inArray, desc } from 'drizzle-orm'
import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'
import { entityMetadata, parseEntityType } from '@/domains/storyteller/core/entities/entity-type-guards'
import { InferredRelationshipType } from '@/domains/storyteller/services/constants/entity-graph-wire'
import { EntityGraphLog } from '@/domains/storyteller/services/constants/entity-graph-log'
import { SqlResultColumn } from '@/shared/data/constants/protocol'
import { readRowNumber, sqlResultRows } from '@/shared/data/json-guards'
import { EntityReference, EntityType } from './entity-registry-service'
import {
  conciseErrorMessage,
  EMBEDDING_DIMENSION,
  fitEmbeddingDimensions,
  vectorSql,
} from './entity-graph-vector'
import {
  DEFAULT_GRAPH_RAG_OPTIONS,
  extractRelationshipsFromText,
  inferRelationshipType,
  scoredEntityFromRow,
  type GraphRAGOptions,
  type ScoredEntity,
} from './entity-graph-types'
import {
  buildProjectGraphEdges,
  similarityFromSqlResult,
  traverseRelatedEntities,
} from './entity-graph-traversal'

export type { GraphRAGOptions, ScoredEntity }
export { EntityGraphService, extractRelationshipsFromText }

/**
 * Live `entity_references.embedding` column dimension. For pgvector,
 * `atttypmod` IS the declared dimension (e.g. vector(1024) → 1024).
 * Probed once per process; falls back to the API output dim on failure.
 */
let embeddingColumnDimPromise: Promise<number> | null = null

function getEmbeddingColumnDim(): Promise<number> {
  if (!embeddingColumnDimPromise) {
    embeddingColumnDimPromise = db
      .execute(
        sql`SELECT atttypmod FROM pg_attribute WHERE attrelid = 'entity_references'::regclass AND attname = 'embedding'`
      )
      .then(result => {
        const row = sqlResultRows(result)[0]
        const dim = readRowNumber(row ?? {}, SqlResultColumn.Atttypmod)
        return dim && dim > 0 ? dim : EMBEDDING_DIMENSION
      })
      .catch(() => {
        embeddingColumnDimPromise = null
        return EMBEDDING_DIMENSION
      })
  }
  return embeddingColumnDimPromise
}

class EntityGraphService {
  async findRelatedEntitiesWithScoring(
    seedIds: string[],
    projectId: string,
    options: GraphRAGOptions = {}
  ): Promise<ScoredEntity[]> {
    return traverseRelatedEntities(seedIds, projectId, options)
  }

  async findRelatedEntities(
    seedIds: string[],
    projectId: string,
    options: GraphRAGOptions = {}
  ): Promise<EntityReference[]> {
    const scored = await this.findRelatedEntitiesWithScoring(seedIds, projectId, options)
    return scored.map(
      ({ relevance: _relevance, hopDistance: _hopDistance, discoveredVia: _discoveredVia, ...entity }) =>
        entity
    )
  }

  async buildEntityEmbedding(entityId: string, content: string): Promise<boolean> {
    try {
      const { getVoyageEmbeddings } =
        await import('@/shared/ai/embeddings/voyage-embeddings')
      const embeddings = getVoyageEmbeddings()
      const [embedding] = await embeddings.embedDocuments([content])

      if (!embedding || embedding.length === 0) return false

      const targetDim = await getEmbeddingColumnDim()
      const fitted = fitEmbeddingDimensions(embedding, targetDim)
      const vecFragment = vectorSql(fitted)
      await db.execute(
        sql`UPDATE entity_references SET embedding = ${vecFragment}, last_referenced_at = NOW() WHERE id = ${entityId}`
      )
      return true
    } catch (err) {
      console.warn(EntityGraphLog.FailedToBuildEmbedding, conciseErrorMessage(err))
      return false
    }
  }

  async semanticSearch(
    query: string,
    projectId: string,
    options: GraphRAGOptions = {}
  ): Promise<EntityReference[]> {
    const opts = { ...DEFAULT_GRAPH_RAG_OPTIONS, ...options }

    try {
      const { getVoyageEmbeddings } =
        await import('@/shared/ai/embeddings/voyage-embeddings')
      const embeddings = getVoyageEmbeddings()
      const queryEmbedding = await embeddings.embedQuery(query)

      if (!queryEmbedding || queryEmbedding.length === 0) {
        console.warn(EntityGraphLog.InvalidQueryEmbedding)
        return []
      }

      const queryVec = fitEmbeddingDimensions(queryEmbedding, await getEmbeddingColumnDim())

      const results = await db
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
          similarity: sql<number>`1 - (${entityReferences.embedding} <=> ${vectorSql(queryVec)})`,
        })
        .from(entityReferences)
        .where(
          and(
            eq(entityReferences.projectId, projectId),
            sql`${entityReferences.embedding} IS NOT NULL`,
            opts.types.length > 0 ? inArray(entityReferences.type, opts.types) : sql`TRUE`
          )
        )
        .orderBy(desc(sql`1 - (${entityReferences.embedding} <=> ${vectorSql(queryVec)})`))
        .limit(opts.maxResults)

      return results
        .filter(r => r.similarity >= opts.threshold)
        .map(r => {
          const entity = scoredEntityFromRow(r, { relevance: r.similarity, hopDistance: 0 })
          if (!entity) return null
          const { relevance: _relevance, hopDistance: _hopDistance, ...reference } = entity
          return reference
        })
        .filter((entity): entity is EntityReference => entity !== null)
    } catch (err) {
      console.warn(EntityGraphLog.SemanticSearchFailed, conciseErrorMessage(err))
      return []
    }
  }

  async getRelationshipStrength(
    entityA: string,
    entityB: string,
    _projectId: string
  ): Promise<number> {
    try {
      const [a, b] = await Promise.all([
        db.select().from(entityReferences).where(eq(entityReferences.id, entityA)).limit(1),
        db.select().from(entityReferences).where(eq(entityReferences.id, entityB)).limit(1),
      ])

      if (!a[0]?.embedding || !b[0]?.embedding) return 0

      const result = await db.execute(
        sql`SELECT 1 - (${vectorSql(a[0].embedding)} <=> ${vectorSql(b[0].embedding)}) as similarity`
      )

      return similarityFromSqlResult(result)
    } catch {
      return 0
    }
  }

  async getDirectRelationships(
    entityId: string,
    projectId: string,
    options: GraphRAGOptions = {}
  ): Promise<Array<ScoredEntity & { relationshipType: InferredRelationshipType }>> {
    const opts = { ...DEFAULT_GRAPH_RAG_OPTIONS, ...options }

    try {
      const [sourceEntity] = await db
        .select()
        .from(entityReferences)
        .where(eq(entityReferences.id, entityId))
        .limit(1)

      if (!sourceEntity?.embedding) return []

      const similar = await db
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
          similarity: sql<number>`1 - (${entityReferences.embedding} <=> ${vectorSql(sourceEntity.embedding)})`,
        })
        .from(entityReferences)
        .where(
          and(
            eq(entityReferences.projectId, projectId),
            sql`${entityReferences.id} != ${entityId}`,
            sql`${entityReferences.embedding} IS NOT NULL`,
            opts.types.length > 0 ? inArray(entityReferences.type, opts.types) : sql`TRUE`
          )
        )
        .orderBy(
          desc(sql`1 - (${entityReferences.embedding} <=> ${vectorSql(sourceEntity.embedding)})`)
        )
        .limit(opts.maxResults)

      return similar
        .filter(e => e.similarity >= opts.threshold)
        .flatMap(entity => {
          const sourceType = parseEntityType(sourceEntity.type)
          const targetType = parseEntityType(entity.type)
          if (!sourceType || !targetType) return []

          const scored = scoredEntityFromRow(entity, {
            relevance: entity.similarity,
            hopDistance: 1,
            discoveredVia: entityId,
          })
          if (!scored) return []

          return [{
            ...scored,
            relationshipType: inferRelationshipType(sourceType, targetType, entity.similarity),
          }]
        })
    } catch (err) {
      console.warn(EntityGraphLog.FailedGetDirectRelationships, err)
      return []
    }
  }

  async buildProjectGraph(
    projectId: string,
    options: { types?: EntityType[]; minStrength?: number } = {}
  ): Promise<{
    nodes: Array<{ id: string; name: string; type: EntityType; metadata: Record<string, unknown> }>
    edges: Array<{ source: string; target: string; weight: number; type: InferredRelationshipType }>
  }> {
    const { types = [StoryEntityType.Character, StoryEntityType.Faction], minStrength = 0.6 } =
      options

    try {
      const entities = await db
        .select()
        .from(entityReferences)
        .where(
          and(
            eq(entityReferences.projectId, projectId),
            sql`${entityReferences.embedding} IS NOT NULL`,
            types.length > 0 ? inArray(entityReferences.type, types) : sql`TRUE`
          )
        )
        .limit(50)

      const nodes = entities.flatMap(e => {
        const type = parseEntityType(e.type)
        if (!type) return []
        return [{
          id: e.id,
          name: e.name,
          type,
          metadata: entityMetadata(e.metadata),
        }]
      })

      const edges = await buildProjectGraphEdges(
        projectId,
        entities,
        minStrength,
        (sourceType, targetType, weight) => {
          if (!sourceType || !targetType) return InferredRelationshipType.Related
          return inferRelationshipType(sourceType, targetType, weight)
        }
      )

      console.log(`[EntityGraph] Built graph: ${nodes.length} nodes, ${edges.length} edges`)
      return { nodes, edges }
    } catch (err) {
      console.warn(EntityGraphLog.FailedBuildProjectGraph, err)
      return { nodes: [], edges: [] }
    }
  }

  extractRelationshipsFromText = extractRelationshipsFromText
}

export const entityGraphService = new EntityGraphService()
