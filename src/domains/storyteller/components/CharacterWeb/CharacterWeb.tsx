'use client'

/**
 * CharacterWeb Component
 *
 * Interactive graph visualization of character relationships using React Flow.
 * Shows characters and factions as nodes, relationships as edges.
 *
 * Features:
 * - Auto-layout using force-directed simulation
 * - Edge styling by relationship type
 * - Click to select and highlight related nodes
 * - Hover for relationship details
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Node,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { cn } from '@/lib/utils'
import { Loader2, RefreshCw } from 'lucide-react'
import CharacterNode from './CharacterNode'
import { ReferenceText } from '../ReferenceText'
import {
  CharacterWebNode,
  CharacterWebEdge,
  CharacterNodeData,
  RELATIONSHIP_STYLES,
  RelationshipMatrixResponse,
  RelationshipType,
} from './types'

// Register custom node types
const nodeTypes = {
  characterNode: CharacterNode,
}

const PERF_DEBUG = process.env.NEXT_PUBLIC_PERF_DEBUG === '1'

export interface CharacterWebProps {
  /** Project ID to fetch relationships for */
  projectId: string
  /** Callback when a node is clicked */
  onNodeClick?: (nodeId: string, nodeData: CharacterNodeData) => void
  /** Entity ID to focus/highlight on mount or when changed */
  focusEntityId?: string | null
  /** Additional className */
  className?: string
  /** Whether to show the minimap */
  showMinimap?: boolean
  /** Whether to show the legend */
  showLegend?: boolean
}

/**
 * Apply force-directed layout with proper spacing
 *
 * Uses a spring-electric model:
 * - All nodes repel each other (electric force)
 * - Connected nodes attract (spring force, proportional to edge weight)
 * - Central node is pinned near center
 * - Groups entities by type for visual clustering
 */
function applyForceLayout(
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

  const positions = new Map<string, { x: number; y: number; vx: number; vy: number }>()
  const centerX = width / 2
  const centerY = height / 2

  // Initial placement: radial by type for natural clustering
  const grouped = new Map<string, CharacterWebNode[]>()
  for (const node of nodes) {
    const t = node.data.type || 'character'
    if (!grouped.has(t)) grouped.set(t, [])
    grouped.get(t)!.push(node)
  }
  const typeOrder = Array.from(new Set(['faction', 'character', 'place', 'event', 'rule', 'item', ...grouped.keys()]))

  const baseRadius = Math.min(width, height) * 0.3

  for (const [typeIdx, type] of typeOrder.entries()) {
    const group = grouped.get(type) || []
    // Each type gets a sector of the circle
    const sectorAngle = (2 * Math.PI * typeIdx) / Math.max(typeOrder.length, 1)

    group.forEach((node, i) => {
      const spread = (Math.PI * 0.6) / Math.max(group.length, 1)
      const angle = sectorAngle + (i - group.length / 2) * spread
      const r = baseRadius + (i % 2) * 100 // Alternate radii for spacing

      positions.set(node.id, {
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle),
        vx: 0,
        vy: 0,
      })
    })
  }

  // Force simulation parameters
  const repulsion = 50000 // Strong repulsion to keep nodes apart
  const springStrength = 0.008 // Gentle attraction along edges
  const damping = 0.92 // Velocity damping
  const minDist = 200 // Minimum distance between nodes
  const centerGravity = 0.001 // Pull toward center

  for (let iter = 0; iter < iterations; iter++) {
    const cooling = 1 - iter / iterations // Gradually reduce forces

    // Repulsion: all pairs
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

        // Stronger repulsion when close
        const force = (repulsion * cooling) / (dist * dist)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force

        posA.vx += fx
        posA.vy += fy
        posB.vx -= fx
        posB.vy -= fy
      }
    }

    // Attraction: connected pairs
    for (const edge of edges) {
      const posSource = positions.get(edge.source)
      const posTarget = positions.get(edge.target)
      if (!posSource || !posTarget) continue

      const dx = posTarget.x - posSource.x
      const dy = posTarget.y - posSource.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1

      // Spring force - stronger edges = closer together, but enforce minimum distance
      const weight = edge.data?.strength || 0.5
      const idealDist = minDist + (1 - weight) * 300 // High similarity = closer
      const displacement = dist - idealDist
      const force = displacement * springStrength * weight * cooling

      const fx = (dx / dist) * force
      const fy = (dy / dist) * force

      posSource.vx += fx
      posSource.vy += fy
      posTarget.vx -= fx
      posTarget.vy -= fy
    }

    // Center gravity
    for (const node of nodes) {
      const pos = positions.get(node.id)
      if (!pos) continue
      pos.vx += (centerX - pos.x) * centerGravity
      pos.vy += (centerY - pos.y) * centerGravity
    }

    // Apply velocities with damping
    for (const node of nodes) {
      const pos = positions.get(node.id)
      if (!pos) continue
      pos.vx *= damping
      pos.vy *= damping
      pos.x += pos.vx
      pos.y += pos.vy

      // Soft bounds
      pos.x = Math.max(100, Math.min(width - 100, pos.x))
      pos.y = Math.max(100, Math.min(height - 100, pos.y))
    }
  }

  return nodes.map(node => ({
    ...node,
    position: {
      x: positions.get(node.id)?.x || centerX,
      y: positions.get(node.id)?.y || centerY,
    },
  }))
}

const getAdaptiveIterationCount = (nodeCount: number): number => {
  if (nodeCount <= 25) return 120
  if (nodeCount <= 50) return 90
  if (nodeCount <= 90) return 60
  return 40
}

const buildLayoutCacheKey = (data: RelationshipMatrixResponse): string => {
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

const cloneNodes = (nodes: CharacterWebNode[]): CharacterWebNode[] =>
  nodes.map(node => ({
    ...node,
    position: { ...node.position },
    data: { ...node.data },
    style: node.style ? { ...node.style } : node.style,
  }))

/**
 * Convert API response to React Flow nodes and edges
 */
function convertToFlowData(data: RelationshipMatrixResponse): {
  nodes: CharacterWebNode[]
  edges: CharacterWebEdge[]
} {
  const nodes: CharacterWebNode[] = data.nodes.map((n, index) => ({
    id: n.id,
    type: 'characterNode',
    position: { x: 0, y: 0 }, // Will be set by layout
    data: {
      name: n.name,
      type: n.type,
      role: n.metadata.role || n.metadata.archetype,
      description: n.description || n.metadata.description || '',
      stressLevel: n.metadata.metrics?.perceivedStakes,
      transformationProgress: n.metadata.metrics?.transformation,
      isCentral: n.id === data.centralCharacter || n.name === data.centralCharacter,
    },
  }))

  const edges: CharacterWebEdge[] = data.edges.map((e, index) => {
    const relType = (e.type as RelationshipType) || 'related'
    const style = RELATIONSHIP_STYLES[relType] || RELATIONSHIP_STYLES.related

    // Scale stroke width by weight for visual weight
    const scaledWidth = Math.max(1, style.strokeWidth * (e.weight || 0.5))

    return {
      id: `e-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      animated: style.animated,
      label: e.label || relType.replace(/_/g, ' '),
      labelStyle: { fill: '#94a3b8', fontSize: 9, fontWeight: 500 },
      labelBgStyle: { fill: '#18181b', fillOpacity: 0.8 },
      labelBgPadding: [4, 2] as [number, number],
      style: {
        stroke: style.color,
        strokeWidth: scaledWidth,
        strokeDasharray:
          style.strokeStyle === 'dashed'
            ? '5,5'
            : style.strokeStyle === 'dotted'
              ? '2,2'
              : undefined,
        opacity: Math.max(0.3, e.weight || 0.5),
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: style.color,
        width: 12,
        height: 12,
      },
      data: {
        relationshipType: relType,
        strength: e.weight,
      },
    }
  })

  return { nodes, edges }
}

export function CharacterWeb({
  projectId,
  onNodeClick,
  focusEntityId,
  className,
  showMinimap = true,
  showLegend = true,
}: CharacterWebProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<CharacterWebNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<CharacterWebEdge>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const reactFlowRef = React.useRef<any>(null)
  const layoutCacheRef = useRef<Map<string, CharacterWebNode[]>>(new Map())

  const adjacencyByNodeId = useMemo(() => {
    const adjacency = new Map<string, Set<string>>()
    for (const edge of edges) {
      if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set())
      if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set())
      adjacency.get(edge.source)!.add(edge.target)
      adjacency.get(edge.target)!.add(edge.source)
    }
    return adjacency
  }, [edges])

  const nodeById = useMemo(() => {
    const map = new Map<string, CharacterWebNode>()
    for (const node of nodes) {
      map.set(node.id, node)
    }
    return map
  }, [nodes])

  // Persist selected node in URL
  const updateUrlWithNode = useCallback((nodeId: string | null) => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (nodeId) {
      url.searchParams.set('node', nodeId)
    } else {
      url.searchParams.delete('node')
    }
    window.history.replaceState({}, '', url.toString())
  }, [])

  // Read initial node selection from URL
  useEffect(() => {
    if (typeof window === 'undefined' || nodes.length === 0) return
    const url = new URL(window.location.href)
    const nodeParam = url.searchParams.get('node')
    if (nodeParam && !selectedNodeId) {
      const targetNode = nodes.find(n => n.id === nodeParam)
      if (targetNode) {
        setSelectedNodeId(nodeParam)
      }
    }
  }, [nodes, selectedNodeId])

  // Focus on entity when focusEntityId changes
  useEffect(() => {
    if (!focusEntityId || nodes.length === 0) return

    // Find the node matching this entity ID
    const targetNode = nodes.find(
      n =>
        n.id === focusEntityId ||
        n.id.includes(focusEntityId) ||
        n.data.name?.toLowerCase().replace(/\s+/g, '-') ===
        focusEntityId.split('-').slice(1).join('-')
    )

    if (targetNode) {
      setSelectedNodeId(targetNode.id)
      updateUrlWithNode(targetNode.id)
      console.log(`[CharacterWeb] Focused on entity: ${targetNode.data.name} (${targetNode.id})`)
    }
  }, [focusEntityId, nodes, updateUrlWithNode])

  // Fetch relationship data
  const fetchRelationships = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const startedAt = typeof performance !== 'undefined' ? performance.now() : 0

    try {
      const response = await fetch(`/api/storyteller/relationships?projectId=${projectId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch relationships')
      }

      const data: RelationshipMatrixResponse = await response.json()

      // Convert to React Flow format
      const { nodes: flowNodes, edges: flowEdges } = convertToFlowData(data)

      const layoutKey = buildLayoutCacheKey(data)
      const cachedLayout = layoutCacheRef.current.get(layoutKey)
      let layoutedNodes: CharacterWebNode[]

      if (cachedLayout) {
        layoutedNodes = cloneNodes(cachedLayout)
      } else {
        const iterations = getAdaptiveIterationCount(flowNodes.length)
        layoutedNodes = applyForceLayout(flowNodes, flowEdges, iterations)
        layoutCacheRef.current.set(layoutKey, cloneNodes(layoutedNodes))
      }

      setNodes(layoutedNodes)
      setEdges(flowEdges)
    } catch (err) {
      console.error('[CharacterWeb] Failed to fetch:', err)
      setError('Failed to load relationships')
    } finally {
      if (PERF_DEBUG && typeof performance !== 'undefined') {
        const duration = Math.round(performance.now() - startedAt)
        console.debug(`[CharacterWeb][perf] fetch+layout completed in ${duration}ms`)
      }
      setIsLoading(false)
    }
  }, [projectId, setNodes, setEdges])

  // Initial load
  useEffect(() => {
    fetchRelationships()
  }, [fetchRelationships])

  const decoratedNodes = useMemo(() => {
    if (!selectedNodeId) return nodes
    const connectedNodeIds = adjacencyByNodeId.get(selectedNodeId) ?? new Set<string>()

    return nodes.map(node => {
      const isSelected = node.id === selectedNodeId
      const isConnected = isSelected || connectedNodeIds.has(node.id)
      return {
        ...node,
        data: {
          ...node.data,
          isHighlighted: !isSelected && connectedNodeIds.has(node.id),
          isSelected,
        },
        style: {
          ...node.style,
          opacity: isConnected ? 1 : 0.15,
          transition: 'opacity 0.3s ease',
        },
      }
    })
  }, [adjacencyByNodeId, nodes, selectedNodeId])

  const decoratedEdges = useMemo(() => {
    if (!selectedNodeId) {
      return edges.map(edge => ({
        ...edge,
        style: {
          ...edge.style,
          opacity: Math.max(0.3, edge.data?.strength || 0.5),
          transition: 'opacity 0.3s ease',
        },
        labelStyle: { ...((edge.labelStyle as any) || {}), opacity: 1 },
      }))
    }

    return edges.map(edge => {
      const isConnected = edge.source === selectedNodeId || edge.target === selectedNodeId
      return {
        ...edge,
        style: {
          ...edge.style,
          opacity: isConnected ? 1 : 0.08,
          transition: 'opacity 0.3s ease',
        },
        labelStyle: {
          ...((edge.labelStyle as any) || {}),
          opacity: isConnected ? 1 : 0,
        },
      }
    })
  }, [edges, selectedNodeId])

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodeById.get(selectedNodeId) ?? null : null),
    [nodeById, selectedNodeId]
  )

  // Handle node click - toggle selection, highlight connections, persist in URL
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<CharacterNodeData>) => {
      const isDeselecting = selectedNodeId === node.id
      const newSelectedId = isDeselecting ? null : node.id

      setSelectedNodeId(newSelectedId)
      updateUrlWithNode(newSelectedId)
      onNodeClick?.(node.id, node.data)
    },
    [selectedNodeId, onNodeClick, updateUrlWithNode]
  )

  // Clear selection when clicking background
  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null)
    updateUrlWithNode(null)
  }, [updateUrlWithNode])

  // Legend items
  const legendItems = useMemo(
    () => [
      { type: 'ally', label: 'Ally', color: RELATIONSHIP_STYLES.ally.color },
      { type: 'enemy', label: 'Enemy', color: RELATIONSHIP_STYLES.enemy.color },
      { type: 'rival', label: 'Rival', color: RELATIONSHIP_STYLES.rival.color },
      { type: 'mentor', label: 'Mentor', color: RELATIONSHIP_STYLES.mentor.color },
      { type: 'lover', label: 'Lover', color: RELATIONSHIP_STYLES.lover.color },
      { type: 'family', label: 'Family', color: RELATIONSHIP_STYLES.family.color },
    ],
    []
  )

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Loading relationships...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <span className="text-red-400">{error}</span>
          <button
            onClick={fetchRelationships}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="text-muted-foreground text-center">
          <p>No character relationships found.</p>
          <p className="text-sm opacity-70 mt-1">Add characters to the cast to see their web.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('h-full w-full', className)}>
      <ReactFlow
        nodes={decoratedNodes}
        edges={decoratedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        className="bg-zinc-950"
        minZoom={0.2}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />
        <Controls
          className="bg-zinc-900 border-zinc-700 [&_button]:bg-zinc-800 [&_button]:border-zinc-700 [&_button]:text-zinc-400 [&_button:hover]:bg-zinc-700"
          showInteractive={false}
        />

        {showMinimap && (
          <MiniMap
            nodeColor={node => {
              const data = node.data as CharacterNodeData
              const colors: Record<string, string> = {
                character: '#9333ea',
                faction: '#3b82f6',
                place: '#10b981',
                event: '#f59e0b',
                rule: '#f43f5e',
                item: '#8b5cf6',
              }
              return colors[data.type] || '#6b7280'
            }}
            style={{ backgroundColor: '#18181b' }}
            maskColor="rgba(0,0,0,0.8)"
            className="bg-zinc-900 border border-zinc-700 rounded"
          />
        )}

        {/* Refresh button */}
        <Panel position="top-left">
          <button
            onClick={fetchRelationships}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Refresh relationships"
          >
            <RefreshCw size={14} />
          </button>
        </Panel>
      </ReactFlow>

      {/* Node Details Panel */}
      {selectedNode && (
        <NodeDetailsPanel
          projectId={projectId}
          node={selectedNode}
          onClose={() => {
            setSelectedNodeId(null)
            updateUrlWithNode(null)
          }}
        />
      )}
    </div>
  )
}

function NodeDetailsPanel({
  node,
  onClose,
  projectId,
}: {
  node: CharacterWebNode
  onClose: () => void
  projectId: string
}) {
  const data = node.data
  const type = data.type || 'character'
  const isCharacter = type === 'character'

  // Helper to format relationship type labels
  const getLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')

  return (
    <div className="absolute top-[70px] right-4 w-72 bg-zinc-950/95 backdrop-blur-md border border-zinc-800/80 rounded-lg shadow-2xl overflow-hidden z-10 animate-in fade-in slide-in-from-right-2 duration-200">
      {/* Ultra-Compact Header */}
      <div className="p-3 flex items-center gap-3 border-b border-zinc-800/50 bg-zinc-900/30">
        <div className="flex-shrink-0 relative">
          {data.avatarUrl ? (
            <img
              src={data.avatarUrl}
              alt={data.name}
              className="w-10 h-10 rounded-md object-cover border border-zinc-700/50 shadow-sm"
            />
          ) : (
            <div
              className={cn(
                'w-10 h-10 rounded-md flex items-center justify-center border border-zinc-700/50 shadow-sm text-sm font-bold',
                type === 'character'
                  ? 'bg-purple-900/20 text-purple-200'
                  : type === 'faction'
                    ? 'bg-blue-900/20 text-blue-200'
                    : type === 'place'
                      ? 'bg-emerald-900/20 text-emerald-200'
                      : type === 'item'
                        ? 'bg-violet-900/20 text-violet-200'
                        : 'bg-zinc-800/50 text-zinc-300'
              )}
            >
              {data.name.charAt(0)}
            </div>
          )}

          {/* Badge Overlay */}
          <div
            className={cn(
              'absolute -bottom-1 -right-1 px-1 py-px rounded-[2px] text-[8px] uppercase font-bold tracking-wider leading-none shadow-sm border border-black/20',
              type === 'character'
                ? 'bg-purple-500/20 text-purple-300'
                : 'bg-zinc-500/20 text-zinc-400'
            )}
          >
            {getLabel(type).slice(0, 4)}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-100 truncate pr-6 leading-tight">
              {data.name}
            </h3>
            <button
              onClick={onClose}
              className="absolute top-2 right-2 text-zinc-600 hover:text-zinc-300 transition-colors p-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <div className="flex items-baseline gap-2 mt-0.5">
            {data.role ? (
              <span className="text-[10px] text-zinc-400 truncate max-w-[140px]" title={data.role}>
                {data.role}
              </span>
            ) : (
              <span className="text-[10px] italic text-zinc-600">No Role</span>
            )}
            {data.isCentral && (
              <span className="text-[8px] text-amber-500/80 font-bold ml-auto uppercase tracking-tighter">
                ANCHOR
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description & Metrics */}
      <div className="p-3 space-y-3">
        {data.description ? (
          <div className="text-[10px] leading-relaxed text-zinc-400 line-clamp-3">
            <ReferenceText
              text={data.description}
              projectId={projectId}
              className="text-zinc-400"
            />
          </div>
        ) : (
          <div className="text-[10px] italic text-zinc-600">No description available.</div>
        )}

        {isCharacter &&
          (data.stressLevel !== undefined || data.transformationProgress !== undefined) && (
            <div className="space-y-2 pt-1">
              {data.stressLevel !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider w-8">
                    Stress
                  </span>
                  <div className="flex-1 h-1 bg-zinc-800/50 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        data.stressLevel > 70
                          ? 'bg-red-500/70'
                          : data.stressLevel > 40
                            ? 'bg-amber-500/70'
                            : 'bg-emerald-500/70'
                      )}
                      style={{ width: `${data.stressLevel}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-zinc-400 w-6 text-right">
                    {data.stressLevel}%
                  </span>
                </div>
              )}

              {data.transformationProgress !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider w-8">Arc</span>
                  <div className="flex-1 h-1 bg-zinc-800/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500/70 rounded-full"
                      style={{ width: `${data.transformationProgress}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-zinc-400 w-6 text-right">
                    {data.transformationProgress}%
                  </span>
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  )
}
