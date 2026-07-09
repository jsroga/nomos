import type { Edge, Node } from '@xyflow/react'
import { readString, recordFromJson } from '@/shared/data/json-guards'

export function nodeDataRecord(node: Node): Record<string, unknown> {
  return recordFromJson(node.data)
}

export function nodeLabel(node: Node, fallback?: string): string {
  const data = nodeDataRecord(node)
  return readString(data.label) ?? fallback ?? node.id
}

export function nodeDescription(node: Node): string {
  return readString(nodeDataRecord(node).description) ?? ''
}

export function nodeTypeField(node: Node, fallback: string): string {
  return readString(nodeDataRecord(node).nodeType) ?? fallback
}

export function groupTimescale(node: Node): string {
  return readString(nodeDataRecord(node).timescale) ?? 'custom'
}

export function edgeLabel(edge: Edge): string | undefined {
  return typeof edge.label === 'string' ? edge.label : undefined
}

export { fileReaderText } from '@/shared/data/json-guards'

export function readChangeNodeType(updates: Record<string, unknown>): string | undefined {
  return readString(updates._changeNodeType)
}
