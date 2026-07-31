'use client'

/**
 * CharacterWeb Component
 *
 * Interactive graph visualization of character relationships using React Flow.
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
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { cn } from '@/shared/data/utils'
import { Loader2, RefreshCw } from 'lucide-react'
import CharacterNode from './CharacterNode'
import {
  CharacterWebEdge,
  CharacterWebNode,
  CharacterNodeData,
  relationshipMatrixFromJson,
} from './types'
import {
  CharacterWebLog,
  CharacterWebMinimapColor,
  CharacterWebNodeType,
  CharacterWebQueryParam,
  CharacterWebSurfaceColor,
  CharacterWebUiCopy,
} from './constants/character-web'
import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'
import { fetchStorytellerRelationships } from '@/domains/storyteller/core/io/storyteller.api'
import {
  applyForceLayout,
  buildLayoutCacheKey,
  cloneNodes,
  convertToFlowData,
  getAdaptiveIterationCount,
} from './character-web-layout'
import {
  decorateCharacterWebEdges,
  decorateCharacterWebNodes,
} from './character-web-decorations'
import { NodeDetailsPanel } from './NodeDetailsPanel'
import { EdgeDetailsPanel } from './EdgeDetailsPanel'
import { isPerfDebugEnabled } from '@/shared/debug/constants/perf-debug'

const nodeTypes = {
  [CharacterWebNodeType.CharacterNode]: CharacterNode,
}

const PERF_DEBUG = isPerfDebugEnabled()

export interface CharacterWebProps {
  projectId: string
  onNodeClick?: (nodeId: string, nodeData: CharacterNodeData) => void
  focusEntityId?: string | null
  className?: string
  showMinimap?: boolean
  showLegend?: boolean
}

export function CharacterWeb({
  projectId,
  onNodeClick,
  focusEntityId,
  className,
  showMinimap = true,
  showLegend: _showLegend = true,
}: CharacterWebProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<CharacterWebNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<CharacterWebEdge>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const layoutCacheRef = useRef<Map<string, CharacterWebNode[]>>(new Map())

  const adjacencyByNodeId = useMemo(() => {
    const adjacency = new Map<string, Set<string>>()
    const bucketFor = (id: string): Set<string> => {
      let set = adjacency.get(id)
      if (!set) {
        set = new Set()
        adjacency.set(id, set)
      }
      return set
    }
    for (const edge of edges) {
      bucketFor(edge.source).add(edge.target)
      bucketFor(edge.target).add(edge.source)
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

  const updateUrlWithNode = useCallback((nodeId: string | null) => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (nodeId) {
      url.searchParams.set(CharacterWebQueryParam.Node, nodeId)
    } else {
      url.searchParams.delete(CharacterWebQueryParam.Node)
    }
    window.history.replaceState({}, '', url.toString())
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || nodes.length === 0) return
    const url = new URL(window.location.href)
    const nodeParam = url.searchParams.get(CharacterWebQueryParam.Node)
    if (nodeParam && !selectedNodeId) {
      const targetNode = nodes.find(n => n.id === nodeParam)
      if (targetNode) {
        setSelectedNodeId(nodeParam)
      }
    }
  }, [nodes, selectedNodeId])

  useEffect(() => {
    if (!focusEntityId || nodes.length === 0) return

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
      console.log(`${CharacterWebLog.FocusedEntity}${targetNode.data.name} (${targetNode.id})`)
    }
  }, [focusEntityId, nodes, updateUrlWithNode])

  const fetchRelationships = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const startedAt = typeof performance !== 'undefined' ? performance.now() : 0

    try {
      const data = relationshipMatrixFromJson(await fetchStorytellerRelationships(projectId))
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
      console.error(CharacterWebLog.FetchFailed, err)
      setError(CharacterWebUiCopy.LoadFailed)
    } finally {
      if (PERF_DEBUG && typeof performance !== 'undefined') {
        const duration = Math.round(performance.now() - startedAt)
        console.debug(`${CharacterWebLog.PerfCompleted}${duration}ms`)
      }
      setIsLoading(false)
    }
  }, [projectId, setNodes, setEdges])

  useEffect(() => {
    fetchRelationships()
  }, [fetchRelationships])

  const decoratedNodes = useMemo(
    () => decorateCharacterWebNodes(nodes, selectedNodeId, adjacencyByNodeId),
    [adjacencyByNodeId, nodes, selectedNodeId]
  )

  const decoratedEdges = useMemo(
    () => decorateCharacterWebEdges(edges, selectedNodeId),
    [edges, selectedNodeId]
  )

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodeById.get(selectedNodeId) ?? null : null),
    [nodeById, selectedNodeId]
  )

  const selectedEdge = useMemo(
    () => (selectedEdgeId ? edges.find(edge => edge.id === selectedEdgeId) ?? null : null),
    [edges, selectedEdgeId]
  )

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<CharacterNodeData>) => {
      const isDeselecting = selectedNodeId === node.id
      const newSelectedId = isDeselecting ? null : node.id

      setSelectedNodeId(newSelectedId)
      setSelectedEdgeId(null)
      updateUrlWithNode(newSelectedId)
      onNodeClick?.(node.id, node.data)
    },
    [selectedNodeId, onNodeClick, updateUrlWithNode]
  )

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: CharacterWebEdge) => {
      setSelectedEdgeId(prev => (prev === edge.id ? null : edge.id))
      setSelectedNodeId(null)
      updateUrlWithNode(null)
    },
    [updateUrlWithNode]
  )

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    updateUrlWithNode(null)
  }, [updateUrlWithNode])

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>{CharacterWebUiCopy.Loading}</span>
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
          <p>{CharacterWebUiCopy.EmptyTitle}</p>
          <p className="text-sm opacity-70 mt-1">{CharacterWebUiCopy.EmptyHint}</p>
        </div>
      </div>
    )
  }

  const sourceNode = selectedEdge ? nodeById.get(selectedEdge.source) : undefined
  const targetNode = selectedEdge ? nodeById.get(selectedEdge.target) : undefined

  return (
    <div className={cn('h-full w-full', className)}>
      <ReactFlow
        nodes={decoratedNodes}
        edges={decoratedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        className="bg-zinc-950"
        minZoom={0.2}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color={CharacterWebSurfaceColor.Canvas} />
        <Controls
          className="bg-zinc-900 border-zinc-700 [&_button]:bg-zinc-800 [&_button]:border-zinc-700 [&_button]:text-zinc-400 [&_button:hover]:bg-zinc-700"
          showInteractive={false}
        />

        {showMinimap && (
          <MiniMap
            nodeColor={(node: CharacterWebNode) => {
              const nodeType = node.data.type
              const colors: Record<CharacterNodeData['type'], string> = {
                [StoryEntityType.Character]: CharacterWebMinimapColor.Character,
                [StoryEntityType.Faction]: CharacterWebMinimapColor.Faction,
                [StoryEntityType.Place]: CharacterWebMinimapColor.Place,
                [StoryEntityType.Event]: CharacterWebMinimapColor.Event,
                [StoryEntityType.Rule]: CharacterWebMinimapColor.Rule,
                [StoryEntityType.Beat]: CharacterWebMinimapColor.Character,
                [StoryEntityType.Episode]: CharacterWebMinimapColor.Character,
                [StoryEntityType.Item]: CharacterWebMinimapColor.Character,
              }
              return colors[nodeType] ?? CharacterWebMinimapColor.Fallback
            }}
            style={{ backgroundColor: CharacterWebSurfaceColor.PanelBg }}
            maskColor={CharacterWebSurfaceColor.Mask}
            className="bg-zinc-900 border border-zinc-700 rounded"
          />
        )}

        <Panel position="top-left">
          <button
            onClick={fetchRelationships}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
            title={CharacterWebUiCopy.RefreshTitle}
          >
            <RefreshCw size={14} />
          </button>
        </Panel>
      </ReactFlow>

      {selectedNode && !selectedEdgeId && (
        <NodeDetailsPanel
          projectId={projectId}
          node={selectedNode}
          onClose={() => {
            setSelectedNodeId(null)
            updateUrlWithNode(null)
          }}
        />
      )}

      {selectedEdge && sourceNode && targetNode && (
        <EdgeDetailsPanel
          edge={selectedEdge}
          sourceName={sourceNode.data.name}
          targetName={targetNode.data.name}
          onClose={() => setSelectedEdgeId(null)}
        />
      )}
    </div>
  )
}
