import { MarkerType } from '@xyflow/react'
import {
  CHARACTER_WEB_DEFAULT_ENTITY_TYPE,
  CHARACTER_WEB_STROKE_DASH_BY_STYLE,
  CharacterWebEdgeStyle,
  CharacterWebNodeType,
} from './constants/character-web'
import { RelationshipStrokeStyle } from './constants/relationship-web-styles'
import {
  CharacterWebEdge,
  CharacterWebNode,
  parseRelationshipType,
  RELATIONSHIP_STYLES,
  RelationshipMatrixResponse,
} from './types'

export function getAdaptiveIterationCount(nodeCount: number): number {
  if (nodeCount <= 25) return 120
  if (nodeCount <= 50) return 90
  if (nodeCount <= 90) return 60
  return 40
}

export function buildLayoutCacheKey(data: RelationshipMatrixResponse): string {
  const nodePart = data.nodes
    .map(n => `${n.id}:${n.type}:${n.name}`)
    .sort()
    .join('|')
  const edgePart = data.edges
    .map(e => `${e.source}->${e.target}:${e.type}:${e.weight ?? 0}`)
    .sort()
    .join('|')
  return `${nodePart}::${edgePart}`
}

export function cloneNodes(nodes: CharacterWebNode[]): CharacterWebNode[] {
  return nodes.map(node => ({
    ...node,
    position: { ...node.position },
    data: { ...node.data },
    style: node.style ? { ...node.style } : node.style,
  }))
}

interface NodePosition {
  x: number
  y: number
  vx: number
  vy: number
}

function initializeNodePositions(
  nodes: CharacterWebNode[],
  width: number,
  height: number
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>()
  const centerX = width / 2
  const centerY = height / 2
  const grouped = new Map<string, CharacterWebNode[]>()

  for (const node of nodes) {
    const entityType = node.data.type || CHARACTER_WEB_DEFAULT_ENTITY_TYPE
    const bucket = grouped.get(entityType) ?? []
    bucket.push(node)
    grouped.set(entityType, bucket)
  }

  const typeOrder = Array.from(grouped.keys())
  const baseRadius = Math.min(width, height) * 0.3

  for (const [typeIdx, type] of typeOrder.entries()) {
    const group = grouped.get(type) ?? []
    const sectorAngle = (2 * Math.PI * typeIdx) / Math.max(typeOrder.length, 1)

    group.forEach((node, index) => {
      const spread = (Math.PI * 0.6) / Math.max(group.length, 1)
      const angle = sectorAngle + (index - group.length / 2) * spread
      const radius = baseRadius + (index % 2) * 100

      positions.set(node.id, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
      })
    })
  }

  return positions
}

function applyRepulsionForces(
  nodes: CharacterWebNode[],
  positions: Map<string, NodePosition>,
  repulsion: number,
  cooling: number
): void {
  for (let i = 0; i < nodes.length; i++) {
    const posA = positions.get(nodes[i].id)
    if (!posA) continue

    for (let j = i + 1; j < nodes.length; j++) {
      const posB = positions.get(nodes[j].id)
      if (!posB) continue

      let dx = posA.x - posB.x
      let dy = posA.y - posB.y
      let dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 1) {
        dx = Math.random() - 0.5
        dy = Math.random() - 0.5
        dist = 1
      }

      const force = (repulsion * cooling) / (dist * dist)
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force

      posA.vx += fx
      posA.vy += fy
      posB.vx -= fx
      posB.vy -= fy
    }
  }
}

function applySpringForces(
  edges: CharacterWebEdge[],
  positions: Map<string, NodePosition>,
  springStrength: number,
  minDist: number,
  cooling: number
): void {
  for (const edge of edges) {
    const posSource = positions.get(edge.source)
    const posTarget = positions.get(edge.target)
    if (!posSource || !posTarget) continue

    const dx = posTarget.x - posSource.x
    const dy = posTarget.y - posSource.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const weight = edge.data?.strength || 0.5
    const idealDist = minDist + (1 - weight) * 300
    const displacement = dist - idealDist
    const force = displacement * springStrength * weight * cooling
    const fx = (dx / dist) * force
    const fy = (dy / dist) * force

    posSource.vx += fx
    posSource.vy += fy
    posTarget.vx -= fx
    posTarget.vy -= fy
  }
}

function applyCenterGravity(
  nodes: CharacterWebNode[],
  positions: Map<string, NodePosition>,
  centerX: number,
  centerY: number,
  centerGravity: number
): void {
  for (const node of nodes) {
    const pos = positions.get(node.id)
    if (!pos) continue
    pos.vx += (centerX - pos.x) * centerGravity
    pos.vy += (centerY - pos.y) * centerGravity
  }
}

function applyVelocities(
  nodes: CharacterWebNode[],
  positions: Map<string, NodePosition>,
  damping: number,
  width: number,
  height: number
): void {
  for (const node of nodes) {
    const pos = positions.get(node.id)
    if (!pos) continue
    pos.vx *= damping
    pos.vy *= damping
    pos.x += pos.vx
    pos.y += pos.vy
    pos.x = Math.max(100, Math.min(width - 100, pos.x))
    pos.y = Math.max(100, Math.min(height - 100, pos.y))
  }
}

export function applyForceLayout(
  nodes: CharacterWebNode[],
  edges: CharacterWebEdge[],
  iterations: number,
  width: number = 2000,
  height: number = 1600
): CharacterWebNode[] {
  if (nodes.length === 0) return nodes
  if (nodes.length === 1) {
    return [{ ...nodes[0], position: { x: width / 2, y: height / 2 } }]
  }

  const positions = initializeNodePositions(nodes, width, height)
  const centerX = width / 2
  const centerY = height / 2
  const repulsion = 50000
  const springStrength = 0.008
  const damping = 0.92
  const minDist = 200
  const centerGravity = 0.001

  for (let iter = 0; iter < iterations; iter++) {
    const cooling = 1 - iter / iterations
    applyRepulsionForces(nodes, positions, repulsion, cooling)
    applySpringForces(edges, positions, springStrength, minDist, cooling)
    applyCenterGravity(nodes, positions, centerX, centerY, centerGravity)
    applyVelocities(nodes, positions, damping, width, height)
  }

  return nodes.map(node => ({
    ...node,
    position: {
      x: positions.get(node.id)?.x ?? centerX,
      y: positions.get(node.id)?.y ?? centerY,
    },
  }))
}

function strokeDashForStyle(strokeStyle: RelationshipStrokeStyle): string | undefined {
  if (strokeStyle === RelationshipStrokeStyle.Dashed) {
    return CHARACTER_WEB_STROKE_DASH_BY_STYLE[RelationshipStrokeStyle.Dashed]
  }
  if (strokeStyle === RelationshipStrokeStyle.Dotted) {
    return CHARACTER_WEB_STROKE_DASH_BY_STYLE[RelationshipStrokeStyle.Dotted]
  }
  return undefined
}

export function convertToFlowData(data: RelationshipMatrixResponse): {
  nodes: CharacterWebNode[]
  edges: CharacterWebEdge[]
} {
  const nodes: CharacterWebNode[] = data.nodes.map(node => ({
    id: node.id,
    type: CharacterWebNodeType.CharacterNode,
    position: { x: 0, y: 0 },
    data: {
      name: node.name,
      type: node.type,
      role: node.metadata.role || node.metadata.archetype,
      description: node.description || node.metadata.description || '',
      stressLevel: node.metadata.metrics?.perceivedStakes,
      transformationProgress: node.metadata.metrics?.transformation,
      isCentral: node.id === data.centralCharacter || node.name === data.centralCharacter,
    },
  }))

  const edges: CharacterWebEdge[] = data.edges.map(edge => {
    const relType = parseRelationshipType(edge.type)
    const style = RELATIONSHIP_STYLES[relType] || RELATIONSHIP_STYLES.related
    const scaledWidth = Math.max(1, style.strokeWidth * (edge.weight || 0.5))

    return {
      id: `e-${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      animated: style.animated,
      label: edge.label || relType.replace(/_/g, ' '),
      labelStyle: { fill: CharacterWebEdgeStyle.LabelFill, fontSize: 9, fontWeight: 500 },
      labelBgStyle: { fill: CharacterWebEdgeStyle.LabelBgFill, fillOpacity: 0.8 },
      labelBgPadding: [4, 2] satisfies [number, number],
      style: {
        stroke: style.color,
        strokeWidth: scaledWidth,
        strokeDasharray: strokeDashForStyle(style.strokeStyle),
        opacity: Math.max(0.3, edge.weight || 0.5),
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: style.color,
        width: 12,
        height: 12,
      },
      data: {
        relationshipType: relType,
        strength: edge.weight,
        evidence: edge.evidence,
        llmGrounded: edge.llmGrounded,
      },
    }
  })

  return { nodes, edges }
}
