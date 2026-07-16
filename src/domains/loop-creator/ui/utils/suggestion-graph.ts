import { Edge, Node } from '@xyflow/react'
import { LoopNodeType } from '@/domains/loop-creator/constants/custom-nodes'
import { readNumber, readString, recordFromJson } from '@/shared/data/json-guards'
import { Suggestion } from '../components/SuggestionPanel'
import {
  LoopEdgeLabel,
  LoopEdgeType,
  LoopFlowNodeType,
  LoopNodeTimescale,
  LoopPlayerAgencyLevel,
  LoopSuggestionKind,
  LoopSuggestionEntitySuffix,
  LOOP_NEW_NODE_LABEL,
  flowNodeTypeForDomain,
  loopSuggestionSortOrder,
} from '../constants/loop-creator-layout'
import { tidyNodesLayout } from './tidy-nodes-layout'

interface SuggestionPayloadRecord {
  id?: string
  nodeType?: LoopNodeType
  position?: { x: number; y: number }
  label?: string
  description?: string
  timescale?: LoopNodeTimescale
  duration?: string
  playerAgency?: LoopPlayerAgencyLevel
  source?: string
  target?: string
  updates?: Record<string, unknown>
}

function readPlayerAgency(value: unknown): LoopPlayerAgencyLevel | undefined {
  const raw = readString(value)
  if (!raw) return undefined
  for (const level of Object.values(LoopPlayerAgencyLevel)) {
    if (level === raw) return level
  }
  return undefined
}

function readNodeType(value: unknown): LoopNodeType | undefined {
  const raw = readString(value)
  if (!raw) return undefined
  for (const nodeType of Object.values(LoopNodeType)) {
    if (nodeType === raw) return nodeType
  }
  return undefined
}

function readTimescale(value: unknown): LoopNodeTimescale | undefined {
  const raw = readString(value)
  if (!raw) return undefined
  for (const timescale of Object.values(LoopNodeTimescale)) {
    if (timescale === raw) return timescale
  }
  return undefined
}

function readPosition(value: unknown): { x: number; y: number } | undefined {
  const record = recordFromJson(value)
  const x = readNumber(record.x)
  const y = readNumber(record.y)
  if (x === undefined || y === undefined) return undefined
  return { x, y }
}

function readSuggestionPayload(payload: unknown): SuggestionPayloadRecord {
  const record = recordFromJson(payload)
  const updates = recordFromJson(record.updates)
  const result: SuggestionPayloadRecord = {}
  const id = readString(record.id)
  if (id) result.id = id
  const nodeType = readNodeType(record.nodeType)
  if (nodeType) result.nodeType = nodeType
  const position = readPosition(record.position)
  if (position) result.position = position
  const label = readString(record.label)
  if (label) result.label = label
  const description = readString(record.description)
  if (description) result.description = description
  const timescale = readTimescale(record.timescale)
  if (timescale) result.timescale = timescale
  const duration = readString(record.duration)
  if (duration) result.duration = duration
  const playerAgency = readPlayerAgency(record.playerAgency)
  if (playerAgency) result.playerAgency = playerAgency
  const source = readString(record.source)
  if (source) result.source = source
  const target = readString(record.target)
  if (target) result.target = target
  if (Object.keys(updates).length > 0) result.updates = updates
  return result
}

function createNodeFromSuggestionPayload(payload: SuggestionPayloadRecord, suffix: string): Node {
  return {
    id: payload.id || `${payload.nodeType}-${Date.now()}-${suffix}`,
    type: flowNodeTypeForDomain(payload.nodeType),
    position: payload.position || { x: 200, y: 200 },
    data: {
      label: payload.label || LOOP_NEW_NODE_LABEL,
      description: payload.description || '',
      nodeType: payload.nodeType || LoopNodeType.Action,
      timescale: payload.timescale || LoopNodeTimescale.Custom,
      duration: payload.duration || '',
      playerAgency: payload.playerAgency || LoopPlayerAgencyLevel.Medium,
    },
  }
}

function createEdgeFromSuggestionPayload(payload: SuggestionPayloadRecord, suffix: string): Edge {
  return {
    id: payload.id || `edge-${Date.now()}-${suffix}`,
    source: payload.source ?? '',
    target: payload.target ?? '',
    label:
      payload.label && payload.label !== LoopEdgeLabel.Triggers ? payload.label : undefined,
    animated: true,
    type: LoopEdgeType.Smoothstep,
  }
}

export interface ApplySuggestionResult {
  nodes: Node[]
  edges: Edge[]
  clearMetadata?: boolean
}

export function applySuggestionToGraph(
  suggestion: Suggestion,
  nodes: Node[],
  edges: Edge[],
): ApplySuggestionResult {
  const payload = readSuggestionPayload(suggestion.payload)

  switch (suggestion.type) {
    case LoopSuggestionKind.AddNode:
      return { nodes: [...nodes, createNodeFromSuggestionPayload(payload, LoopSuggestionEntitySuffix.Single)], edges }
    case LoopSuggestionKind.RemoveNode: {
      const nodeId = payload.id
      if (!nodeId) return { nodes, edges }
      return {
        nodes: nodes.filter(n => n.id !== nodeId),
        edges: edges.filter(e => e.source !== nodeId && e.target !== nodeId),
      }
    }
    case LoopSuggestionKind.AddEdge:
      return { nodes, edges: [...edges, createEdgeFromSuggestionPayload(payload, LoopSuggestionEntitySuffix.Single)] }
    case LoopSuggestionKind.RemoveEdge: {
      const edgeId = payload.id
      if (!edgeId) return { nodes, edges }
      return { nodes, edges: edges.filter(e => e.id !== edgeId) }
    }
    case LoopSuggestionKind.ModifyNode: {
      const { id, updates } = payload
      if (!id || !updates) return { nodes, edges }
      return {
        nodes: nodes.map(n => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)),
        edges,
      }
    }
    case LoopSuggestionKind.ModifyEdge: {
      const { id, updates } = payload
      if (!id || !updates) return { nodes, edges }
      return {
        nodes,
        edges: edges.map(e => (e.id === id ? { ...e, ...updates } : e)),
      }
    }
    case LoopSuggestionKind.RemoveAllNodes:
      return { nodes: [], edges: [], clearMetadata: true }
    default:
      return { nodes, edges }
  }
}

export function applyAllSuggestionsToGraph(
  suggestions: Suggestion[],
  nodes: Node[],
  edges: Edge[],
): ApplySuggestionResult {
  const sortedSuggestions = [...suggestions].sort(
    (a, b) => loopSuggestionSortOrder(a.type) - loopSuggestionSortOrder(b.type),
  )

  let nextNodes = [...nodes]
  let nextEdges = [...edges]
  let clearMetadata = false

  for (const suggestion of sortedSuggestions) {
    const result = applySuggestionToGraph(suggestion, nextNodes, nextEdges)
    nextNodes = result.nodes
    nextEdges = result.edges
    if (result.clearMetadata) clearMetadata = true
  }

  return {
    nodes: tidyNodesLayout(nextNodes, nextEdges),
    edges: nextEdges,
    clearMetadata,
  }
}

export function isGroupFlowNode(node: Node): boolean {
  return node.type === LoopFlowNodeType.Group
}
