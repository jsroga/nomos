import { Edge, Node } from '@xyflow/react'
import { readNumber, readString, recordFromJson } from '@/shared/data/json-guards'
import { autoLayoutNodes } from '@/domains/loop-creator/core/layout'
import {
  LoopEdgeType,
  LoopFlowNodeType,
} from '../constants/loop-creator-layout'
import {
  importedEdgesFromJson,
  importedNodesFromJson,
  parseImportedJson,
  readDescriptionFromMetadata,
  readGenreFromMetadata,
  readImportedLoopName,
} from '../types/loop-layout-wires'

export interface LoopImportResult {
  nodes: Node[]
  edges: Edge[]
  metadata: unknown | null
  analysis: unknown | null
  loopName: string
  gameGenre?: string
  gameDescription?: string
}

function canvasNodeFromImport(raw: Record<string, unknown>): Node {
  const node: Node = {
    id: readString(raw.id) ?? `imported-${Date.now()}`,
    position: {
      x: readNumber(recordFromJson(raw.position).x) ?? 0,
      y: readNumber(recordFromJson(raw.position).y) ?? 0,
    },
    data: recordFromJson(raw.data),
  }
  const type = readString(raw.type)
  if (type) node.type = type
  const parentId = readString(raw.parentNode) ?? readString(raw.parentId)
  if (parentId) node.parentId = parentId
  if (type !== LoopFlowNodeType.Group) node.draggable = true
  const style = recordFromJson(raw.style)
  if (Object.keys(style).length > 0) node.style = style
  return node
}

function canvasEdgeFromImport(
  raw: Record<string, unknown>,
  labelBg: string,
  labelFill: string,
): Edge {
  const edge: Edge = {
    id: readString(raw.id) ?? `edge-${Date.now()}`,
    source: readString(raw.source) ?? '',
    target: readString(raw.target) ?? '',
    type: LoopEdgeType.Smoothstep,
    labelBgStyle: { fill: labelBg, fillOpacity: 0.9 },
    labelBgPadding: [6, 10],
    labelBgBorderRadius: 6,
    labelStyle: { fill: labelFill, fontSize: 11, fontWeight: 500 },
  }
  const label = readString(raw.label)
  if (label) edge.label = label
  return edge
}

export function parseLoopImportFile(
  content: string,
  fileName: string,
  jsonExtension: string,
  genreJoin: string,
  labelBg: string,
  labelFill: string,
): LoopImportResult | null {
  const data = parseImportedJson(content)
  if (!data) return null

  const rawNodes = importedNodesFromJson(data.nodes)
  const rawEdges = importedEdgesFromJson(data.edges)
  const transformedNodes = autoLayoutNodes(
    rawNodes.map(canvasNodeFromImport),
    rawEdges.map(raw => canvasEdgeFromImport(raw, labelBg, labelFill)),
  )
  const transformedEdges = rawEdges.map(raw => canvasEdgeFromImport(raw, labelBg, labelFill))
  const metadata = data.metadata ?? null
  const analysis = data.analysis ?? null

  return {
    nodes: transformedNodes,
    edges: transformedEdges,
    metadata,
    analysis,
    loopName: readImportedLoopName(metadata, fileName, jsonExtension),
    gameGenre: readGenreFromMetadata(metadata, genreJoin),
    gameDescription: readDescriptionFromMetadata(metadata),
  }
}

export interface LoopImportGameContextPatch {
  gameGenre?: string
  gameDescription?: string
}

export function gameContextPatchFromImport(result: LoopImportResult): LoopImportGameContextPatch {
  const patch: LoopImportGameContextPatch = {}
  if (result.gameGenre) patch.gameGenre = result.gameGenre
  if (result.gameDescription) patch.gameDescription = result.gameDescription
  return patch
}
