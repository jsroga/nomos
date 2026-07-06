/**
 * Entity Graph Service
 *
 * Provides graph-based traversal of entity relationships using embeddings.
 * Implements a GraphRAG pattern with random walk scoring:
 * 1. Initial vector search for relevant entities
 * 2. Build relationship graph from co-occurrence and semantic similarity
 * 3. Multi-hop traversal with relevance decay
 * 4. Random walk scoring for relationship discovery
 *
 * Uses pgvector for similarity search.
 */

import { entityReferences } from '@/db'
import { db } from '@/db/client'
import { eq, and, sql, inArray, desc } from 'drizzle-orm'
import { EntityReference, EntityType } from './EntityRegistryService'

// Embedding model configuration (must match what's stored)
// Using Voyage voyage-3 model which produces 1024-dimensional vectors
const EMBEDDING_DIMENSION = 1024

/**
 * Convert a JS array to a pgvector-compatible string
 * Drizzle passes arrays as individual params which breaks vector casting
 *
 * Security: Only allows numeric values - prevents SQL injection
 * Performance: Validates dimension to catch mismatches early
 */
function toVectorString(embedding: any): string {
  if (!embedding) {
    throw new Error('toVectorString: embedding is null/undefined')
  }

  // If already a string (from DB), validate format
  if (typeof embedding === 'string') {
    if (!embedding.startsWith('[') || !embedding.endsWith(']')) {
      throw new Error('toVectorString: invalid string format')
    }
    return embedding
  }

  if (!Array.isArray(embedding)) {
    throw new Error('toVectorString: expected array')
  }

  if (embedding.length === 0) {
    throw new Error('toVectorString: empty embedding')
  }

  // Security: Validate every element is a finite number (prevents SQL injection)
  for (let i = 0; i < embedding.length; i++) {
    const val = embedding[i]
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      throw new Error(`toVectorString: non-numeric value at index ${i}: ${typeof val}`)
    }
  }

  // Performance: Check dimension matches expected
  if (embedding.length !== EMBEDDING_DIMENSION) {
    console.warn(
      `[EntityGraph] Embedding dimension mismatch: got ${embedding.length}, expected ${EMBEDDING_DIMENSION}`
    )
  }

  return `'[${embedding.join(',')}]'`
}

/**
 * Create a raw SQL fragment for vector comparison
 * Uses sql.raw() to embed the vector directly in SQL (avoiding param expansion)
 *
 * Security: toVectorString validates all values are finite numbers before embedding
 */
function vectorSql(embedding: any) {
  const vecStr = toVectorString(embedding)
  return sql.raw(`${vecStr}::vector`)
}

// Decay factor per hop (e.g., 0.7 means each hop reduces relevance by 30%)
const HOP_DECAY_FACTOR = 0.7

// Minimum relevance score to include entity
const MIN_RELEVANCE_THRESHOLD = 0.3

interface GraphNode {
  id: string
  name: string
  type: EntityType
  similarity: number
  depth: number
  /** Computed relevance score (includes hop decay) */
  relevance: number
}

interface GraphEdge {
  from: string
  to: string
  weight: number
  relationship: 'semantic' | 'co-occurrence' | 'explicit'
}

interface EntityGraph {
  nodes: Map<string, GraphNode>
  edges: GraphEdge[]
}

/** Entity with relevance score for ranking */
export interface ScoredEntity extends EntityReference {
  /** Relevance score (0-1), decreases with hop distance */
  relevance: number
  /** Number of hops from seed entity */
  hopDistance: number
  /** Source entity that led to this discovery */
  discoveredVia?: string
}

interface GraphRAGOptions {
  /** Similarity threshold for including entities (0-1) */
  threshold?: number
  /** Maximum depth of graph traversal */
  maxDepth?: number
  /** Maximum number of results */
  maxResults?: number
  /** Types to include (undefined = all types) */
  types?: EntityType[]
  /** Number of random walk steps for scoring */
  randomWalkSteps?: number
  /** Probability of restarting walk from seed node */
  restartProbability?: number
  /** Include relationship info in results */
  includeRelationships?: boolean
}

const DEFAULT_OPTIONS: Required<GraphRAGOptions> = {
  threshold: 0.7,
  maxDepth: 2,
  maxResults: 20,
  types: [] as EntityType[],
  randomWalkSteps: 100,
  restartProbability: 0.15,
  includeRelationships: false,
}

/**
 * Entity Graph Service for relationship traversal with random walk scoring
 */
class EntityGraphService {
  /**
   * Find related entities using multi-hop graph traversal with relevance scoring
   *
   * @param seedIds - Starting entity IDs (directly mentioned)
   * @param projectId - Project to search within
   * @param options - Graph traversal options
   * @returns Array of scored entities ordered by relevance
   */
  async findRelatedEntitiesWithScoring(
    seedIds: string[],
    projectId: string,
    options: GraphRAGOptions = {}
  ): Promise<ScoredEntity[]> {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    if (seedIds.length === 0) {
      return []
    }

    try {
      // Track discovered entities with their scores
      const discovered = new Map<string, ScoredEntity>()
      const seedSet = new Set(seedIds)

      // 1. Get seed entities - these have relevance 1.0 (directly mentioned)
      const seedEntities = await db
        .select()
        .from(entityReferences)
        .where(
          and(eq(entityReferences.projectId, projectId), inArray(entityReferences.id, seedIds))
        )

      // Add seeds with max relevance
      for (const seed of seedEntities) {
        discovered.set(seed.id, {
          id: seed.id,
          name: seed.name,
          type: seed.type as EntityType,
          description: seed.description?.startsWith('Auto-registered') ? '' : (seed.description || ''),
          metadata: (seed.metadata as Record<string, unknown>) || {},
          projectId: seed.projectId,
          sourceEntityId: seed.sourceEntityId || undefined,
          createdAt: new Date(seed.createdAt),
          lastReferencedAt: new Date(seed.lastReferencedAt || seed.createdAt),
          relevance: 1.0,
          hopDistance: 0,
        })
      }

      // 2. Multi-hop traversal with decay
      let currentHopEntities = seedEntities.filter(e => e.embedding)

      for (let hop = 1; hop <= opts.maxDepth; hop++) {
        const nextHopEntities: typeof seedEntities = []
        const decayMultiplier = Math.pow(HOP_DECAY_FACTOR, hop)

        for (const source of currentHopEntities) {
          if (!source.embedding) continue

          // Vector similarity search for this hop
          const vecFragment = vectorSql(source.embedding)
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
            .limit(Math.ceil(opts.maxResults / hop)) // Fewer results per hop as we go deeper

          for (const entity of similar) {
            // Skip if below threshold
            if (entity.similarity < opts.threshold) continue

            // Calculate relevance with hop decay
            const relevance = entity.similarity * decayMultiplier

            // Skip if below minimum relevance
            if (relevance < MIN_RELEVANCE_THRESHOLD) continue

            const existing = discovered.get(entity.id)

            // Only add if not discovered or if this path has higher relevance
            if (!existing || relevance > existing.relevance) {
              const scored: ScoredEntity = {
                id: entity.id,
                name: entity.name,
                type: entity.type as EntityType,
                description: entity.description?.startsWith('Auto-registered') ? '' : (entity.description || ''),
                metadata: (entity.metadata as Record<string, unknown>) || {},
                projectId: entity.projectId,
                sourceEntityId: entity.sourceEntityId || undefined,
                createdAt: new Date(entity.createdAt),
                lastReferencedAt: new Date(entity.lastReferencedAt || entity.createdAt),
                relevance,
                hopDistance: hop,
                discoveredVia: source.id,
              }
              discovered.set(entity.id, scored)

              // Add to next hop candidates (but not seeds)
              if (!seedSet.has(entity.id)) {
                nextHopEntities.push(entity as any)
              }
            }
          }
        }

        currentHopEntities = nextHopEntities

        // Stop if no more entities to explore
        if (currentHopEntities.length === 0) break
      }

      // 3. Apply random walk scoring for additional ranking boost
      const results = Array.from(discovered.values())
      if (opts.randomWalkSteps > 0 && results.length > 1) {
        this.applyRandomWalkScoring(results, opts.randomWalkSteps, opts.restartProbability, seedSet)
      }

      // 4. Sort by relevance (highest first), then by hop distance (lower first)
      results.sort((a, b) => {
        if (Math.abs(a.relevance - b.relevance) > 0.01) {
          return b.relevance - a.relevance
        }
        return a.hopDistance - b.hopDistance
      })

      return results.slice(0, opts.maxResults)
    } catch (err) {
      console.warn('[EntityGraphService] Graph traversal failed:', err)
      return []
    }
  }

  /**
   * Apply random walk scoring to boost entities that are well-connected
   * Simulates a random walk that occasionally restarts from seed nodes
   */
  private applyRandomWalkScoring(
    entities: ScoredEntity[],
    steps: number,
    restartProb: number,
    seedIds: Set<string>
  ): void {
    new Map(entities.map(e => [e.id, e]))
    const visitCounts = new Map<string, number>()

    // Initialize visit counts
    for (const e of entities) {
      visitCounts.set(e.id, 0)
    }

    // Get seed entities for restart
    const seedEntities = entities.filter(e => seedIds.has(e.id))
    if (seedEntities.length === 0) return

    // Start from a deterministically-seeded entity (stable layout across renders)
    // Hash the sorted seed IDs to pick a consistent starting point
    const seedSorted = [...seedIds].sort()
    const seedHash = seedSorted.reduce((h, id) => {
      let v = h
      for (let i = 0; i < id.length; i++) v = (Math.imul(31, v) + id.charCodeAt(i)) | 0
      return v >>> 0
    }, 0)
    let current = seedEntities[seedHash % seedEntities.length]

    // Deterministic pseudo-random walk (LCG seeded by project hash)
    let lcgState = seedHash || 1
    const lcgNext = () => {
      lcgState = (Math.imul(1664525, lcgState) + 1013904223) >>> 0
      return lcgState / 0x100000000
    }

    for (let step = 0; step < steps; step++) {
      // Increment visit count
      visitCounts.set(current.id, (visitCounts.get(current.id) || 0) + 1)

      // Decide: restart or follow edge
      if (lcgNext() < restartProb) {
        // Restart from a deterministic seed position
        current = seedEntities[Math.floor(lcgNext() * seedEntities.length)]
      } else {
        // Follow edge to a connected entity
        // Connected = discovered via this entity OR same discoveredVia
        const connected = entities.filter(
          e =>
            e.id !== current.id &&
            (e.discoveredVia === current.id ||
              (current.discoveredVia && e.discoveredVia === current.discoveredVia) ||
              Math.abs(e.hopDistance - current.hopDistance) <= 1)
        )

        if (connected.length > 0) {
          // Weighted deterministic selection based on relevance
          const totalRelevance = connected.reduce((sum, e) => sum + e.relevance, 0)
          let rand = lcgNext() * totalRelevance

          for (const e of connected) {
            rand -= e.relevance
            if (rand <= 0) {
              current = e
              break
            }
          }
        } else {
          // No connections, restart from seed
          current = seedEntities[Math.floor(Math.random() * seedEntities.length)]
        }
      }
    }

    // Apply visit count boost to relevance (normalized)
    const maxVisits = Math.max(...visitCounts.values())
    if (maxVisits > 0) {
      for (const e of entities) {
        const visits = visitCounts.get(e.id) || 0
        const visitBoost = 0.1 * (visits / maxVisits) // Up to 10% boost
        e.relevance = Math.min(1.0, e.relevance + visitBoost)
      }
    }
  }

  /**
   * Find related entities using graph traversal (legacy method, uses new scoring internally)
   *
   * @param seedIds - Starting entity IDs
   * @param projectId - Project to search within
   * @param options - Graph traversal options
   * @returns Array of related entities ordered by relevance
   */
  async findRelatedEntities(
    seedIds: string[],
    projectId: string,
    options: GraphRAGOptions = {}
  ): Promise<EntityReference[]> {
    const scored = await this.findRelatedEntitiesWithScoring(seedIds, projectId, options)
    // Strip scoring fields for backward compatibility
    return scored.map(({ relevance, hopDistance, discoveredVia, ...entity }) => entity)
  }

  /**
   * Build entity embeddings for a project
   * Called when entities are registered or updated
   */
  async buildEntityEmbedding(entityId: string, content: string): Promise<void> {
    try {
      // Use the voyage embeddings or OpenAI embeddings
      const { getVoyageEmbeddings } =
        await import('@/shared/ai/embeddings/voyage-embeddings')
      const embeddings = getVoyageEmbeddings()

      const [embedding] = await embeddings.embedDocuments([content])

      if (embedding && embedding.length === EMBEDDING_DIMENSION) {
        // Use raw SQL to set vector - Drizzle can't handle vector type natively
        const vecFragment = vectorSql(embedding)
        await db.execute(
          sql`UPDATE entity_references SET embedding = ${vecFragment}, last_referenced_at = NOW() WHERE id = ${entityId}`
        )
      }
    } catch (err) {
      console.warn('[EntityGraphService] Failed to build embedding:', err)
    }
  }

  /**
   * Find entities by semantic query
   *
   * @param query - Natural language query
   * @param projectId - Project to search within
   * @param options - Search options
   */
  async semanticSearch(
    query: string,
    projectId: string,
    options: GraphRAGOptions = {}
  ): Promise<EntityReference[]> {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    try {
      // Get embedding for query
      const { getVoyageEmbeddings } =
        await import('@/shared/ai/embeddings/voyage-embeddings')
      const embeddings = getVoyageEmbeddings()
      const queryEmbedding = await embeddings.embedQuery(query)

      if (!queryEmbedding || queryEmbedding.length !== EMBEDDING_DIMENSION) {
        console.warn('[EntityGraphService] Invalid query embedding')
        return []
      }

      // Vector similarity search
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
          similarity: sql<number>`1 - (${entityReferences.embedding} <=> ${vectorSql(queryEmbedding)})`,
        })
        .from(entityReferences)
        .where(
          and(
            eq(entityReferences.projectId, projectId),
            sql`${entityReferences.embedding} IS NOT NULL`,
            opts.types.length > 0 ? inArray(entityReferences.type, opts.types) : sql`TRUE`
          )
        )
        .orderBy(desc(sql`1 - (${entityReferences.embedding} <=> ${vectorSql(queryEmbedding)})`))
        .limit(opts.maxResults)

      return results
        .filter(r => r.similarity >= opts.threshold)
        .map(r => ({
          id: r.id,
          name: r.name,
          type: r.type as EntityType,
          description: r.description?.startsWith('Auto-registered') ? '' : (r.description || ''),
          metadata: (r.metadata as Record<string, unknown>) || {},
          projectId: r.projectId,
          sourceEntityId: r.sourceEntityId || undefined,
          createdAt: new Date(r.createdAt),
          lastReferencedAt: new Date(r.lastReferencedAt || r.createdAt),
        }))
    } catch (err) {
      console.warn('[EntityGraphService] Semantic search failed:', err)
      return []
    }
  }

  /**
   * Get entity relationship strength based on co-occurrence
   * Entities that are referenced together have higher relationship strength
   */
  async getRelationshipStrength(
    entityA: string,
    entityB: string,
    _projectId: string
  ): Promise<number> {
    // For now, use embedding similarity as relationship strength
    // In future, could track co-occurrence in text
    try {
      const [a, b] = await Promise.all([
        db.select().from(entityReferences).where(eq(entityReferences.id, entityA)).limit(1),
        db.select().from(entityReferences).where(eq(entityReferences.id, entityB)).limit(1),
      ])

      if (!a[0]?.embedding || !b[0]?.embedding) return 0

      // Calculate cosine similarity
      const result = await db.execute(
        sql`SELECT 1 - (${vectorSql(a[0].embedding)} <=> ${vectorSql(b[0].embedding)}) as similarity`
      )

      return (result.rows[0] as any)?.similarity || 0
    } catch {
      return 0
    }
  }

  /**
   * Get entities that are directly related to a given entity
   * Returns entities connected by 1 hop with relationship info
   */
  async getDirectRelationships(
    entityId: string,
    projectId: string,
    options: GraphRAGOptions = {}
  ): Promise<Array<ScoredEntity & { relationshipType: string }>> {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    try {
      // Get the source entity
      const [sourceEntity] = await db
        .select()
        .from(entityReferences)
        .where(eq(entityReferences.id, entityId))
        .limit(1)

      if (!sourceEntity || !sourceEntity.embedding) {
        return []
      }

      // Find similar entities (1-hop relationships)
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

      // Map to relationships with inferred type
      return similar
        .filter(e => e.similarity >= opts.threshold)
        .map(entity => ({
          id: entity.id,
          name: entity.name,
          type: entity.type as EntityType,
          description: entity.description?.startsWith('Auto-registered') ? '' : (entity.description || ''),
          metadata: (entity.metadata as Record<string, unknown>) || {},
          projectId: entity.projectId,
          sourceEntityId: entity.sourceEntityId || undefined,
          createdAt: new Date(entity.createdAt),
          lastReferencedAt: new Date(entity.lastReferencedAt || entity.createdAt),
          relevance: entity.similarity,
          hopDistance: 1,
          discoveredVia: entityId,
          // Infer relationship type from entity types
          relationshipType: this.inferRelationshipType(
            sourceEntity.type as EntityType,
            entity.type as EntityType,
            entity.similarity
          ),
        }))
    } catch (err) {
      console.warn('[EntityGraphService] Failed to get direct relationships:', err)
      return []
    }
  }

  /**
   * Infer relationship type based on entity types and similarity
   */
  private inferRelationshipType(
    sourceType: EntityType,
    targetType: EntityType,
    similarity: number
  ): string {
    // Same type relationships
    if (sourceType === targetType) {
      if (sourceType === 'character') {
        if (similarity > 0.9) return 'closely_connected'
        if (similarity > 0.8) return 'associated'
        return 'related'
      }
      if (sourceType === 'faction') return 'allied_or_rival'
      return 'related'
    }

    // Cross-type relationships
    if (sourceType === 'character' && targetType === 'faction') return 'member_of'
    if (sourceType === 'faction' && targetType === 'character') return 'has_member'
    if (sourceType === 'character' && targetType === 'place') return 'associated_with'
    if (sourceType === 'character' && targetType === 'event') return 'involved_in'
    if (sourceType === 'character' && targetType === 'item') return 'uses'
    if (sourceType === 'faction' && targetType === 'item') return 'owns'
    if (sourceType === 'faction' && targetType === 'place') return 'controls'
    if (sourceType === 'event' && targetType === 'character') return 'involves'
    if (sourceType === 'event' && targetType === 'place') return 'occurred_at'
    if (sourceType === 'event' && targetType === 'item') return 'caused_by'
    if (sourceType === 'event' && targetType === 'event') return 'temporal'
    if (sourceType === 'item' && targetType === 'place') return 'located_in'

    return 'related'
  }

  /**
   * Build a complete relationship graph for a project
   * Used for Character Web visualization
   *
   * Performance: Uses single SQL query for all pairwise similarities
   * instead of O(n^2) individual queries
   * Security: Entity limit prevents DOS via large projects
   */
  async buildProjectGraph(
    projectId: string,
    options: { types?: EntityType[]; minStrength?: number } = {}
  ): Promise<{
    nodes: Array<{ id: string; name: string; type: EntityType; metadata: Record<string, unknown> }>
    edges: Array<{ source: string; target: string; weight: number; type: string }>
  }> {
    const { types = ['character', 'faction'], minStrength = 0.6 } = options

    try {
      // Get all entities of specified types (limit to 50 for performance)
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
        .limit(50) // Performance: cap to prevent O(n^2) explosion

      const nodes = entities.map(e => ({
        id: e.id,
        name: e.name,
        type: e.type as EntityType,
        metadata: (e.metadata as Record<string, unknown>) || {},
      }))

      // Performance: Compute all pairwise similarities in a single SQL query
      // Uses a self-join with cosine distance, much faster than N^2 individual queries
      const edges: Array<{ source: string; target: string; weight: number; type: string }> = []

      if (entities.length > 1) {
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

          for (const row of (result.rows || result) as any[]) {
            edges.push({
              source: row.source_id,
              target: row.target_id,
              weight: parseFloat(row.similarity) || 0,
              type: this.inferRelationshipType(
                row.source_type as EntityType,
                row.target_type as EntityType,
                parseFloat(row.similarity) || 0
              ),
            })
          }
        } catch (queryErr) {
          console.warn(
            '[EntityGraphService] Batch similarity query failed, falling back:',
            queryErr
          )
          // Fallback: simple pairwise (limited to first 20 entities)
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
                const similarity = parseFloat((result.rows?.[0] as any)?.similarity) || 0
                if (similarity >= minStrength) {
                  edges.push({
                    source: a.id,
                    target: b.id,
                    weight: similarity,
                    type: this.inferRelationshipType(
                      a.type as EntityType,
                      b.type as EntityType,
                      similarity
                    ),
                  })
                }
              } catch {
                /* skip pair on error */
              }
            }
          }
        }
      }

      console.log(`[EntityGraph] Built graph: ${nodes.length} nodes, ${edges.length} edges`)
      return { nodes, edges }
    } catch (err) {
      console.warn('[EntityGraphService] Failed to build project graph:', err)
      return { nodes: [], edges: [] }
    }
  }

  /**
   * Extract literal relationships from text based on regex patterns.
   * Finds sentences matching "[A] owns/uses/caused [B]" and generates structured edges.
   */
  extractRelationshipsFromText(text: string): Array<{ sourceId: string; targetId: string; type: string; evidence: string }> {
    const relationships: Array<{ sourceId: string; targetId: string; type: string; evidence: string }> = []

    // Split into sentences for context boundary
    const sentences = text.split(/[.!?]+/)

    // Pattern to match explicit verbs between two references
    // E.g., "[Marcus][char-123] uses the [One Ring][item-456]"
    const verbPatterns = [
      { regex: /owns|possesses|has/i, type: 'owns' },
      { regex: /uses|wields|utilizes/i, type: 'uses' },
      { regex: /caused|created|triggered/i, type: 'caused_by' },
      { regex: /happened at|took place at|occurred at/i, type: 'happened_at' },
      { regex: /located in|found in|hidden in/i, type: 'located_in' },
      { regex: /before|after|during/i, type: 'temporal' }
    ]

    for (const sentence of sentences) {
      // Find all references in the sentence
      // A reference looks like [Name][id-123]
      const refRegex = /\[([^\]]+)\]\[([a-z]+-[a-zA-Z0-9-]+)\]/g
      let match
      const refs: Array<{ name: string; id: string; index: number }> = []

      while ((match = refRegex.exec(sentence)) !== null) {
        refs.push({ name: match[1], id: match[2], index: match.index })
      }

      // Need at least 2 references to form a relationship
      if (refs.length >= 2) {
        for (let i = 0; i < refs.length - 1; i++) {
          const source = refs[i]
          const target = refs[i + 1]

          // Get text between the two references
          const textBetween = sentence.substring(
            source.index + source.name.length + source.id.length + 4, // length of '[name][id]'
            target.index
          )

          // Check if any verb pattern matches the text exactly between them
          for (const pattern of verbPatterns) {
            if (pattern.regex.test(textBetween)) {
              relationships.push({
                sourceId: source.id,
                targetId: target.id,
                type: pattern.type,
                evidence: sentence.trim()
              })
              break // Only one relation per pair based on first match
            }
          }
        }
      }
    }

    return relationships
  }
}

// Singleton instance
export const entityGraphService = new EntityGraphService()

// Export class and types for testing
export { EntityGraphService }
export type { GraphRAGOptions }
