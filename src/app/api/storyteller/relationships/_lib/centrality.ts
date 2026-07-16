import type { GraphEdge, GraphNode } from './graph-types'

export function computeCentralCharacter(
  nodes: GraphNode[],
  edges: GraphEdge[]
): string | undefined {
  const centrality = new Map<string, number>()
  for (const node of nodes) centrality.set(node.id, 0)
  for (const edge of edges) {
    centrality.set(edge.source, (centrality.get(edge.source) || 0) + edge.weight)
    centrality.set(edge.target, (centrality.get(edge.target) || 0) + edge.weight)
  }

  let centralCharacter: string | undefined
  let maxCentrality = 0
  for (const [id, score] of centrality) {
    if (score > maxCentrality) {
      maxCentrality = score
      centralCharacter = id
    }
  }

  return centralCharacter
}
