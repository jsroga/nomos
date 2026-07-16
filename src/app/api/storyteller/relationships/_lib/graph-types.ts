import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'
import { GRAPH_NODE_TYPES } from '@/domains/storyteller/core/io/constants/relationships-api'

export interface GraphNode {
  id: string
  name: string
  type: StoryEntityType
  metadata: Record<string, unknown>
}

export interface GraphEdge {
  source: string
  target: string
  weight: number
  type: string
  label?: string
  evidence?: string
  llmGrounded?: boolean
}

export interface RelationshipResponse {
  nodes: GraphNode[]
  edges: GraphEdge[]
  centralCharacter?: string
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

export function parseGraphNodeType(value: unknown): GraphNode['type'] | undefined {
  if (typeof value !== 'string') return undefined
  for (const nodeType of GRAPH_NODE_TYPES) {
    if (value === nodeType) return nodeType
  }
  return undefined
}

export function addNode(
  nodes: GraphNode[],
  nodeIds: Set<string>,
  id: string,
  name: string,
  type: GraphNode['type'],
  metadata: Record<string, unknown> = {}
) {
  if (nodeIds.has(id)) return
  nodeIds.add(id)
  nodes.push({ id, name, type, metadata })
}

export function addEdge(
  edges: GraphEdge[],
  edgeIds: Set<string>,
  source: string,
  target: string,
  weight: number,
  type: string,
  label?: string
) {
  const key = [source, target].sort().join('|')
  if (edgeIds.has(key)) return
  edgeIds.add(key)
  edges.push({ source, target, weight, type, label })
}
