import { Edge, Node } from '@xyflow/react'
import { readNumber, readString, recordFromJson } from '@/shared/data/json-guards'

function readFlowPosition(value: unknown): { x: number; y: number } {
  const record = recordFromJson(value)
  return {
    x: readNumber(record.x) ?? 0,
    y: readNumber(record.y) ?? 0,
  }
}

function flowNodeFromPersisted(raw: Record<string, unknown>): Node | null {
  const id = readString(raw.id)
  if (!id) return null

  const node: Node = {
    id,
    position: readFlowPosition(raw.position),
    data: recordFromJson(raw.data),
  }

  const type = readString(raw.type)
  if (type) node.type = type

  const parentId = readString(raw.parentId) ?? readString(raw.parentNode)
  if (parentId) node.parentId = parentId

  if (typeof raw.draggable === 'boolean') node.draggable = raw.draggable

  const style = recordFromJson(raw.style)
  if (Object.keys(style).length > 0) node.style = style

  return node
}

function flowEdgeFromPersisted(raw: Record<string, unknown>): Edge | null {
  const id = readString(raw.id)
  const source = readString(raw.source)
  const target = readString(raw.target)
  if (!id || !source || !target) return null

  const edge: Edge = { id, source, target }
  const type = readString(raw.type)
  if (type) edge.type = type
  const label = readString(raw.label)
  if (label) edge.label = label
  if (typeof raw.animated === 'boolean') edge.animated = raw.animated
  return edge
}

export function persistedNodesFromUnknown(value: unknown): Node[] {
  if (!Array.isArray(value)) return []
  const nodes: Node[] = []
  for (const item of value) {
    const record = recordFromJson(item)
    const node = flowNodeFromPersisted(record)
    if (node) nodes.push(node)
  }
  return nodes
}

export function persistedEdgesFromUnknown(value: unknown): Edge[] {
  if (!Array.isArray(value)) return []
  const edges: Edge[] = []
  for (const item of value) {
    const record = recordFromJson(item)
    const edge = flowEdgeFromPersisted(record)
    if (edge) edges.push(edge)
  }
  return edges
}
