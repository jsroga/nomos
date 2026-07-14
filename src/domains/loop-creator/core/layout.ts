import { Node, Edge } from '@xyflow/react'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import {
  CANVAS_EXTENT_PARENT,
  CANVAS_NODE_TYPE_GROUP,
} from '@/domains/loop-creator/constants/graph-state-defaults'
import { LAYOUT_LOG_PREFIX, LAYOUT_LOG_SUFFIX } from '@/domains/loop-creator/constants/layout-messages'
import { loopTimescaleSortIndex } from '@/domains/loop-creator/constants/timescale-order'
import { groupTimescale } from './loop-node-wire'

const GROUP_GAP = 350
const GROUP_PADDING_X = 100
const GROUP_PADDING_Y = 100
const NODE_WIDTH = 300
const NODE_HEIGHT = 240
const NODE_GAP_Y = 160 // Significantly more vertical gap to avoid text/edge overcrowding

/**
 * Finds the order of nodes in a loop by following edges
 */
function findLoopOrder(nodeIds: string[], edges: Edge[]): string[] {
  if (nodeIds.length === 0) return []

  // Build adjacency map from edges
  const outgoing: Record<string, string> = {}
  const incoming: Record<string, string> = {}

  edges.forEach(edge => {
    if (nodeIds.includes(edge.source) && nodeIds.includes(edge.target)) {
      outgoing[edge.source] = edge.target
      incoming[edge.target] = edge.source
    }
  })

  // Find start node - prefer one without incoming edge, or first in list
  let startNode = nodeIds[0]
  for (const nodeId of nodeIds) {
    if (!incoming[nodeId]) {
      startNode = nodeId
      break
    }
  }

  // Follow the chain
  const ordered: string[] = []
  const visited = new Set<string>()
  let current: string | undefined = startNode

  while (current && !visited.has(current)) {
    visited.add(current)
    ordered.push(current)
    current = outgoing[current]
  }

  // Add any unvisited nodes
  nodeIds.forEach(id => {
    if (!ordered.includes(id)) {
      ordered.push(id)
    }
  })

  return ordered
}

export const autoLayoutNodes = (nodes: Node[], edges: Edge[]): Node[] => {
  const groups = nodes.filter(n => n.type === CANVAS_NODE_TYPE_GROUP)
  const children = nodes.filter(n => n.type !== CANVAS_NODE_TYPE_GROUP)

  // Sort groups by timescale order
  const sortedGroups = [...groups].sort((a, b) => {
    const orderA = loopTimescaleSortIndex(groupTimescale(a))
    const orderB = loopTimescaleSortIndex(groupTimescale(b))
    return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB)
  })

  const resultNodes: Node[] = []
  let currentGroupX = 50

  sortedGroups.forEach(group => {
    // Find children that belong to this group
    const groupChildren = children.filter(c => {
      const legacyParent = readString(recordFromJson(c).parentNode)
      return (
        c.parentId === group.id ||
        legacyParent === group.id ||
        groupTimescale(c) === groupTimescale(group)
      )
    })

    const childIds = groupChildren.map(c => c.id)

    // Find the loop order from edges
    const orderedIds = findLoopOrder(childIds, edges)
    const nodeCount = orderedIds.length

    // Calculate vertical layout dimensions
    // Nodes stacked vertically in a single column, centered horizontally
    const totalNodesHeight = nodeCount * NODE_HEIGHT + (nodeCount - 1) * NODE_GAP_Y
    const groupWidth = NODE_WIDTH + GROUP_PADDING_X * 2
    const groupHeight = totalNodesHeight + GROUP_PADDING_Y * 2 + 50 // +50 for header

    // Center X position for nodes
    const nodeCenterX = GROUP_PADDING_X

    // Position children in vertical stack (top to bottom flow)
    const positionedChildren: Node[] = []
    orderedIds.forEach((nodeId, index) => {
      const child = groupChildren.find(c => c.id === nodeId)
      if (!child) return

      // Stack vertically
      const x = nodeCenterX
      const y = GROUP_PADDING_Y + 50 + index * (NODE_HEIGHT + NODE_GAP_Y)

      positionedChildren.push({
        ...child,
        position: { x, y },
        parentId: group.id,
        extent: CANVAS_EXTENT_PARENT,
      })
    })

    // Add the group node FIRST
    resultNodes.push({
      ...group,
      position: { x: currentGroupX, y: 80 },
      style: {
        ...group.style,
        width: groupWidth,
        height: groupHeight,
      },
    })

    // Then add all children
    resultNodes.push(...positionedChildren)

    currentGroupX += groupWidth + GROUP_GAP
  })

  // Handle orphan nodes
  const processedChildIds = new Set(
    resultNodes.filter(n => n.type !== CANVAS_NODE_TYPE_GROUP).map(n => n.id),
  )
  const orphans = children.filter(c => !processedChildIds.has(c.id))

  orphans.forEach((orphan, index) => {
    resultNodes.push({
      ...orphan,
      position: { x: 50 + index * 250, y: 800 },
    })
  })

  console.log(LAYOUT_LOG_PREFIX, resultNodes.length, LAYOUT_LOG_SUFFIX)

  return resultNodes
}
