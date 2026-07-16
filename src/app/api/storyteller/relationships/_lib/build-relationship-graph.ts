import {
  RelationshipsQueryParam,
  RelationshipsQueryValue,
  RelationshipsApiLog,
  RELATIONSHIPS_CENTRAL_CHARACTER_NONE,
} from '@/domains/storyteller/core/io/constants/relationships-api'
import { tryCachedRelationshipGraph } from './cached-edges'
import { computeCentralCharacter } from './centrality'
import { addTextCoOccurrenceEdges } from './co-occurrence-edges'
import { addEmbeddingSimilarityEdges } from './embedding-similarity-edges'
import { addFactionMembershipEdges } from './faction-edges'
import { buildGraphNodes } from './build-graph-nodes'
import { fetchProjectGraphContext } from './fetch-project-data'
import type { GraphEdge, RelationshipResponse } from './graph-types'

function shouldForceRefresh(requestUrl: string): boolean {
  const refreshParam = new URL(requestUrl).searchParams.get(RelationshipsQueryParam.Refresh)
  return refreshParam === RelationshipsQueryValue.RefreshTrue
}

async function buildLiveRelationshipEdges(params: {
  projectId: string
  context: NonNullable<Awaited<ReturnType<typeof fetchProjectGraphContext>>>
  nodeIds: Set<string>
  nodes: RelationshipResponse['nodes']
}): Promise<{ validEdges: GraphEdge[]; totalBeforeFilter: number }> {
  const edges: GraphEdge[] = []
  const edgeIds = new Set<string>()

  await addEmbeddingSimilarityEdges({
    projectId: params.projectId,
    dbEntities: params.context.dbEntities,
    edges,
    edgeIds,
  })

  addFactionMembershipEdges({
    factions: params.context.factions,
    nodeIds: params.nodeIds,
    edges,
    edgeIds,
  })

  addTextCoOccurrenceEdges({
    storyPlan: params.context.storyPlan,
    factions: params.context.factions,
    nodes: params.nodes,
    edges,
    edgeIds,
  })

  if (edges.length === 0) {
    console.log(RelationshipsApiLog.NoEdgesFound)
  }

  const validEdges = edges.filter(e => params.nodeIds.has(e.source) && params.nodeIds.has(e.target))
  return { validEdges, totalBeforeFilter: edges.length }
}

export async function buildRelationshipGraph(
  projectId: string,
  requestUrl: string
): Promise<RelationshipResponse | null> {
  const context = await fetchProjectGraphContext(projectId)
  if (!context) return null

  const { nodes, nodeIds, canonicalNodeId } = buildGraphNodes(context)

  if (!shouldForceRefresh(requestUrl)) {
    const cached = await tryCachedRelationshipGraph({
      projectId,
      nodes,
      nodeIds,
      canonicalNodeId,
    })
    if (cached) return cached
  }

  const { validEdges, totalBeforeFilter } = await buildLiveRelationshipEdges({
    projectId,
    context,
    nodeIds,
    nodes,
  })

  const centralCharacter = computeCentralCharacter(nodes, validEdges)

  console.log(
    `[Relationships] Final: ${nodes.length} nodes, ${validEdges.length} edges (${totalBeforeFilter - validEdges.length} orphaned removed), central: ${centralCharacter || RELATIONSHIPS_CENTRAL_CHARACTER_NONE}`
  )

  return { nodes, edges: validEdges, centralCharacter }
}
