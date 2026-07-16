import { db } from '@/db/client'
import { relationshipEdges } from '@/db'
import { eq, and, gt } from 'drizzle-orm'
import { RelationshipsApiLog } from '@/domains/storyteller/core/io/constants/relationships-api'
import { computeCentralCharacter } from './centrality'
import type { GraphEdge, GraphNode, RelationshipResponse } from './graph-types'

const EDGE_CACHE_TTL_MS = 30 * 60 * 1000

export async function tryCachedRelationshipGraph(params: {
  projectId: string
  nodes: GraphNode[]
  nodeIds: Set<string>
  canonicalNodeId: (id: string) => string
}): Promise<RelationshipResponse | null> {
  const cacheThreshold = new Date(Date.now() - EDGE_CACHE_TTL_MS)

  try {
    const cachedEdges = await db
      .select()
      .from(relationshipEdges)
      .where(
        and(
          eq(relationshipEdges.projectId, params.projectId),
          gt(relationshipEdges.extractedAt, cacheThreshold)
        )
      )

    if (cachedEdges.length === 0) return null

    const cachedEdgeList: GraphEdge[] = cachedEdges.map(e => ({
      source: params.canonicalNodeId(e.sourceId),
      target: params.canonicalNodeId(e.targetId),
      weight: e.weight,
      type: e.relationshipType,
      label: e.label ?? e.relationshipType.replace(/_/g, ' '),
      evidence: e.evidence ?? undefined,
      llmGrounded: e.llmGrounded,
    }))

    const validCachedEdges = cachedEdgeList.filter(
      e => params.nodeIds.has(e.source) && params.nodeIds.has(e.target)
    )

    if (validCachedEdges.length === 0) return null

    console.log(`[Relationships] DB cache hit: ${validCachedEdges.length} edges (skipping LLM)`)

    return {
      nodes: params.nodes,
      edges: validCachedEdges,
      centralCharacter: computeCentralCharacter(params.nodes, validCachedEdges),
    }
  } catch (err) {
    console.warn(RelationshipsApiLog.DbCacheReadFailed, err)
    return null
  }
}
