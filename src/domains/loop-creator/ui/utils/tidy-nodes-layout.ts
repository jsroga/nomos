import { Edge, Node } from '@xyflow/react'
import { LoopFlowNodeType } from '../constants/loop-creator-layout'

const CARD_WIDTH = 240
const CARD_HEIGHT = 180
const GAP_X = 180
const GAP_Y = 140
const START_X = 100
const START_Y = 100

/** Smart tidy layout that follows edge connections for proper flow. */
export function tidyNodesLayout(nodesToLayout: Node[], edgesToLayout: Edge[]): Node[] {
  if (nodesToLayout.length === 0) return nodesToLayout

  const groups = nodesToLayout.filter(n => n.type === LoopFlowNodeType.Group)
  const regularNodes = nodesToLayout.filter(n => n.type !== LoopFlowNodeType.Group)

  if (regularNodes.length === 0) return nodesToLayout

  const outgoing: Record<string, string[]> = {}
  const incoming: Record<string, string[]> = {}

  for (const edge of edgesToLayout) {
    if (!outgoing[edge.source]) outgoing[edge.source] = []
    if (!incoming[edge.target]) incoming[edge.target] = []
    outgoing[edge.source].push(edge.target)
    incoming[edge.target].push(edge.source)
  }

  const nodeIds = new Set(regularNodes.map(n => n.id))
  const roots = regularNodes.filter(n => {
    const incomingNodes = incoming[n.id] || []
    return incomingNodes.filter(id => nodeIds.has(id)).length === 0
  })

  if (roots.length === 0 && regularNodes.length > 0) {
    roots.push(regularNodes[0])
  }

  const nodeLevel: Record<string, number> = {}
  const nodeLane: Record<string, number> = {}
  const visited = new Set<string>()
  const queue: Array<{ id: string; level: number }> = []

  roots.forEach((root, index) => {
    queue.push({ id: root.id, level: 0 })
    nodeLane[root.id] = index
  })

  while (queue.length > 0) {
    const next = queue.shift()
    if (!next) break
    const { id, level } = next
    if (visited.has(id)) continue
    visited.add(id)
    nodeLevel[id] = Math.max(nodeLevel[id] || 0, level)

    const children = outgoing[id] || []
    children.forEach((childId, index) => {
      if (nodeIds.has(childId) && !visited.has(childId)) {
        queue.push({ id: childId, level: level + 1 })
        if (nodeLane[childId] === undefined) {
          nodeLane[childId] = (nodeLane[id] || 0) + (children.length > 1 ? index * 0.5 : 0)
        }
      }
    })
  }

  let orphanLane = roots.length
  regularNodes.forEach(n => {
    if (!visited.has(n.id)) {
      nodeLevel[n.id] = 0
      nodeLane[n.id] = orphanLane++
    }
  })

  const nodesPerLevel: Record<number, string[]> = {}
  regularNodes.forEach(n => {
    const level = nodeLevel[n.id] || 0
    if (!nodesPerLevel[level]) nodesPerLevel[level] = []
    nodesPerLevel[level].push(n.id)
  })

  const positionedNodes = regularNodes.map(node => {
    const level = nodeLevel[node.id] || 0
    const nodesAtLevel = nodesPerLevel[level] || []
    const indexAtLevel = nodesAtLevel.indexOf(node.id)
    const totalHeight = nodesAtLevel.length * (CARD_HEIGHT + GAP_Y) - GAP_Y
    const startY = START_Y + Math.max(0, (400 - totalHeight) / 2)

    return {
      ...node,
      position: {
        x: START_X + level * (CARD_WIDTH + GAP_X),
        y: startY + indexAtLevel * (CARD_HEIGHT + GAP_Y),
      },
    }
  })

  return [...groups, ...positionedNodes]
}
