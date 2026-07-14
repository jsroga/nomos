'use client'

import React, { useCallback, useState, useEffect } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  addEdge,
  Node,
  Edge,
  Connection,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  ReactFlowInstance,
  MarkerType,
  ConnectionLineType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  ChatInterface,
  useChatStream,
  getGameEntityProvider,
  SectionProgress,
  ActiveAgentsPanel,
  SmartQuickActions,
  StreamingTerminal,
  StreamingSectionsInline,
} from '@/shared/chat'
import {
  getLoopCreatorMentionProviders,
  buildLoopCreatorProjectContext,
} from '../core/mentions/providers'
import { isAdminUser } from '@/shared/auth/admin-users'
import {
  Sparkles,
  Bot,
  Cpu,
  Scale,
  TrendingUp,
  Layout,
  Brain,
  Upload,
  Info,
  Wand2,
  Plus,
  Swords,
  Gamepad2,
  Star,
  BarChart3,
  Layers,
  Check,
  AlertCircle,
  Cloud,
  Search,
} from 'lucide-react'
import { nodeTypes } from './CustomNodes'
import { autoLayoutNodes } from '../core/layout'
import {
  fileReaderText,
  nodeDescription,
  nodeLabel,
  readChangeNodeType,
} from '@/domains/loop-creator/core/loop-node-wire'
import {
  parseAddNodePayload,
  parseConnectionPayload,
  parseIdPayload,
  parseLoopStreamStateCounts,
  parseLoopStreamThreadId,
  parseMechanicPayload,
  parseModifyNodePayload,
} from '@/domains/loop-creator/core/loop-agent-action-wire'
import type { PersistedGameLoop } from './LoopSelector'
import { useAutoSave } from '../state/useAutoSave'
import { SuggestionPanel, Suggestion } from './SuggestionPanel'
import { PropertiesPanel } from './PropertiesPanel'
import { MarketAnalysisPanel } from './MarketAnalysisPanel'
import { LoopSelector } from './LoopSelector'
import { LoopEmptyState } from './LoopEmptyState'
import { LoopNodeType } from '@/domains/loop-creator/constants/custom-nodes'
import {
  CANVAS_NODE_TYPE_GROUP,
  NEXT_AGENT_SUPERVISOR,
} from '@/domains/loop-creator/constants/graph-state-defaults'
import { LoopHttpMethod } from '@/domains/loop-creator/constants/loop-http'
import {
  LoopAgentBgClass,
  LoopAgentTextClass,
  LoopCanvasKind,
  LoopChatMessageType,
  LoopCreatorAgentKey,
  LoopEdgeLabel,
  LoopEdgeType,
  LoopFlowNodeType,
  LoopFlowPosition,
  LoopGroupBorderStyle,
  LoopLayoutAgentAction,
  LoopLlmRole,
  LoopMechanicKind,
  LoopNodeTimescale,
  LoopPlayerAgencyLevel,
  LoopSuggestionKind,
  LOOP_CONNECTION_STROKE,
  LOOP_CREATE_DEFAULT_DESCRIPTIONS,
  LOOP_CREATE_DEFAULT_LABELS,
  LOOP_CREATE_FAILED_ERROR,
  LOOP_DOMAIN_TO_FLOW_NODE,
  LOOP_GENRE_JOIN,
  LOOP_GROUP_BG_COLOR,
  LOOP_GROUP_BORDER_COLOR,
  LOOP_IMPORT_EDGE_LABEL_BG,
  LOOP_IMPORT_EDGE_LABEL_FILL,
  LOOP_JSON_EXTENSION,
  LOOP_JSON_PARSE_ALERT,
  LOOP_LOG_ACCEPT_SUGGESTION,
  LOOP_LOG_ACTION_RECEIVED,
  LOOP_LOG_APPLIED_ALL,
  LOOP_LOG_APPLY_ALL,
  LOOP_LOG_AUTO_MESSAGE_SUFFIX,
  LOOP_LOG_AUTO_START,
  LOOP_LOG_CANVAS_RESET,
  LOOP_LOG_CLEAR_CANVAS,
  LOOP_LOG_CREATE_FAILED,
  LOOP_LOG_JSON_PARSE_ERROR,
  LOOP_LOG_LOOP_CREATED,
  LOOP_LOG_MARKET_ANALYSIS_OPEN,
  LOOP_LOG_REJECT_SUGGESTION,
  LOOP_LOG_SEND_AUTO_MESSAGE,
  LOOP_LOG_SWITCHED_LOOP,
  LOOP_LOG_UNKNOWN_ACTION,
  LOOP_MECHANIC_LABEL_SUFFIX,
  LOOP_MODIFY_NODE_JOIN,
  LOOP_NEW_NODE_LABEL,
  flowNodeTypeForDomain,
  loopSuggestionSortOrder,
} from './constants/loop-creator-layout'
import { Button } from '@/components/Button'
import { EntitySelectorButton } from '@/components/EntityPicker'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/Dialog'
import { ScrollArea } from '@/components/ScrollArea'
import { Badge } from '@/components/Badge'
import { DomainSidebar } from '@/components/DomainSidebar'

// Agent configuration with icons for each loop creator agent
const LOOP_AGENT_CONFIG = {
  [LoopCreatorAgentKey.System]: {
    color: LoopAgentTextClass.Muted,
    bgColor: LoopAgentBgClass.System,
    icon: <Bot className="w-4 h-4" />,
  },
  [LoopCreatorAgentKey.Supervisor]: {
    color: LoopAgentTextClass.Blue,
    bgColor: LoopAgentBgClass.Blue,
    icon: <Brain className="w-4 h-4" />,
  },
  [LoopCreatorAgentKey.LoopPlanner]: {
    color: LoopAgentTextClass.Purple,
    bgColor: LoopAgentBgClass.Purple,
    icon: <Layout className="w-4 h-4" />,
  },
  [LoopCreatorAgentKey.MechanicsDesigner]: {
    color: LoopAgentTextClass.Emerald,
    bgColor: LoopAgentBgClass.Emerald,
    icon: <Cpu className="w-4 h-4" />,
  },
  [LoopCreatorAgentKey.BalanceAnalyst]: {
    color: LoopAgentTextClass.Amber,
    bgColor: LoopAgentBgClass.Amber,
    icon: <Scale className="w-4 h-4" />,
  },
  [LoopCreatorAgentKey.ProgressionArchitect]: {
    color: LoopAgentTextClass.Rose,
    bgColor: LoopAgentBgClass.Rose,
    icon: <TrendingUp className="w-4 h-4" />,
  },
  [LoopCreatorAgentKey.MarketAnalyst]: {
    color: LoopAgentTextClass.Indigo,
    bgColor: LoopAgentBgClass.Indigo,
    icon: <Search className="w-4 h-4" />,
  },
  [LoopCreatorAgentKey.LoopAssistant]: {
    color: LoopAgentTextClass.Purple,
    bgColor: LoopAgentBgClass.Purple,
    icon: <Sparkles className="w-4 h-4" />,
  },
  [LoopCreatorAgentKey.User]: {
    color: LoopAgentTextClass.Foreground,
    bgColor: LoopAgentBgClass.Card,
    icon: <Bot className="w-4 h-4" />,
  },
}

import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { useTour } from '@/components/shell/Tour'

const EDGE_LABEL_BG_PADDING: [number, number] = [6, 4]

interface LoopCreatorLayoutProps {
  projectId: string
}

export function LoopCreatorLayout({ projectId }: LoopCreatorLayoutProps) {
  const { currentStep } = useTour()
  const isTourActive = currentStep >= 0
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [threadId, setThreadId] = useState<string | null>(null)
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)
  const [loopMetadata, setLoopMetadata] = useState<any>(null)
  const [analysis, setAnalysis] = useState<any>(null)
  const [isActivityPanelOpen, setIsActivityPanelOpen] = useState(false)
  const [currentLoopId, setCurrentLoopId] = useState<string | null>(null)
  const [gameContext, setGameContext] = useState({
    gameGenre: '',
    gamePlatform: '',
    targetAudience: '',
    gameDescription: '',
  })
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [isMarketAnalysisOpen, setIsMarketAnalysisOpen] = useState(false)
  const [marketAnalysisKey, setMarketAnalysisKey] = useState(0) // Key to force refresh panel
  const [showCreateLoopDialog, setShowCreateLoopDialog] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Fetch user email for admin features (eval button)
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = (await import('@supabase/auth-helpers-nextjs')).createClientComponentClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUserEmail(user?.email || null)
    }
    fetchUser()
  }, [])

  // Trigger the LoopSelector dialog to create a new loop
  const handleCreateLoopFromEmptyState = useCallback(() => {
    setShowCreateLoopDialog(true)
  }, [])

  // Auto-save hook for persisting changes
  const { saveStatus } = useAutoSave({
    loopId: currentLoopId,
    nodes,
    edges,
    metadata: loopMetadata,
    analysis,
    debounceMs: 2000,
    enabled: !!currentLoopId,
  })

  const handleTidyUp = useCallback(() => {
    setNodes(nds => {
      const laidOutNodes = autoLayoutNodes(nds, edges)
      return laidOutNodes
    })

    // Fit view after layout
    setTimeout(() => {
      if (rfInstance) {
        rfInstance.fitView({ padding: 0.1, duration: 800 })
      }
    }, 100)
  }, [edges, setNodes, rfInstance])

  // --- MENTIONS SYSTEM ---
  // Includes domain-specific mentions + cross-domain game entities
  const mentionProviders = React.useMemo(
    () => [
      ...getLoopCreatorMentionProviders(),
      getGameEntityProvider(), // Cross-domain entities from all tools
    ],
    []
  )

  const projectContextForMentions = React.useMemo(
    () =>
      buildLoopCreatorProjectContext({
        projectId,
        mechanics: nodes
          .filter(n => n.type !== LoopCanvasKind.Loop)
          .map(n => ({
            id: n.id,
            name: nodeLabel(n),
            type: n.type,
            description: nodeDescription(n),
          })),
        loops: nodes
          .filter(n => n.type === LoopCanvasKind.Loop)
          .map(n => ({
            id: n.id,
            name: nodeLabel(n),
            type: LoopCanvasKind.Loop,
            description: nodeDescription(n),
          })),
        connections: edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
        })),
        balanceAnalysis: analysis,
        gameGenre: gameContext.gameGenre,
        gamePlatform: gameContext.gamePlatform,
        targetAudience: gameContext.targetAudience,
      }),
    [projectId, nodes, edges, analysis, gameContext]
  )

  // Create a new loop in the database
  const createNewLoop = useCallback(
    async (
      name: string,
      importedNodes?: Node[],
      importedEdges?: Edge[],
      importedMetadata?: any,
      importedAnalysis?: any
    ) => {
      try {
        const response = await fetch('/api/loop-creator/loops', {
          method: LoopHttpMethod.Post,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            name,
            nodes: importedNodes || nodes,
            edges: importedEdges || edges,
            metadata: importedMetadata || loopMetadata,
            analysis: importedAnalysis || analysis,
          }),
        })

        if (!response.ok) {
          throw new Error(LOOP_CREATE_FAILED_ERROR)
        }

        const newLoop = await response.json()
        setCurrentLoopId(newLoop.id)
        console.log(LOOP_LOG_LOOP_CREATED, newLoop.id)
        return newLoop
      } catch (error) {
        console.error(LOOP_LOG_CREATE_FAILED, error)
        return null
      }
    },
    [projectId, nodes, edges, loopMetadata, analysis]
  )

  // Handle loop change (switching between loops)
  const handleLoopChange = useCallback(
    (loop: any | null) => {
      if (loop) {
        setNodes(loop.nodes || [])
        setEdges(loop.edges || [])
        setLoopMetadata(loop.metadata || null)
        setAnalysis(loop.analysis || null)
        setCurrentLoopId(loop.id)
        setSuggestions([])
        setSelectedNode(null)
        console.log(LOOP_LOG_SWITCHED_LOOP, loop.name)
      } else {
        setNodes([])
        setEdges([])
        setLoopMetadata(null)
        setAnalysis(null)
        setCurrentLoopId(null)
        setSuggestions([])
        setSelectedNode(null)
      }
    },
    [setNodes, setEdges]
  )

  // Handle reset (clear canvas, keep loop record)
  const handleReset = useCallback(() => {
    setNodes([])
    setEdges([])
    setLoopMetadata(null)
    setAnalysis(null)
    setSuggestions([])
    setSelectedNode(null)
    console.log(LOOP_LOG_CANVAS_RESET)
    // Auto-save will persist the empty state
  }, [setNodes, setEdges])

  // Create loop for LoopSelector
  const handleCreateLoopFromSelector = useCallback(
    async (name: string, gameConcept?: string) => {
      // Update game context if provided
      if (gameConcept) {
        setGameContext(prev => ({
          ...prev,
          gameDescription: gameConcept,
        }))
      }
      return createNewLoop(name, [], [])
    },
    [createNewLoop]
  )

  // Store pending auto-message to send after loop creation
  const [pendingAutoMessage, setPendingAutoMessage] = useState<string | null>(null)

  // Auto-start generation when loop is created with game concept
  const handleLoopCreatedWithConcept = useCallback((_loop: PersistedGameLoop, gameConcept: string) => {
    console.log(LOOP_LOG_AUTO_START, gameConcept)

    // Update game context
    setGameContext(prev => ({
      ...prev,
      gameDescription: gameConcept,
    }))

    // Queue auto-message (will be sent via useEffect once handleSendMessage is ready)
    const autoMessage = `I want to create a game like this: ${gameConcept}\n\nPlease design the core game loop nodes and mechanics for this concept.`
    setPendingAutoMessage(autoMessage)
  }, [])

  // Suggestion handlers
  const handleAcceptSuggestion = useCallback(
    (suggestion: Suggestion) => {
      console.log(LOOP_LOG_ACCEPT_SUGGESTION, suggestion.type, suggestion.payload)

      switch (suggestion.type) {
        case LoopSuggestionKind.AddNode: {
          const payload = suggestion.payload
          const newNode: Node = {
            id: payload.id || `${payload.nodeType}-${Date.now()}`,
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
          setNodes(nds => [...nds, newNode])
          break
        }
        case LoopSuggestionKind.RemoveNode: {
          const nodeId = suggestion.payload.id
          setNodes(nds => nds.filter(n => n.id !== nodeId))
          // Also remove connected edges
          setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId))
          break
        }
        case LoopSuggestionKind.AddEdge: {
          const payload = suggestion.payload
          const newEdge: Edge = {
            id: payload.id || `edge-${Date.now()}`,
            source: payload.source,
            target: payload.target,
            // Only show label if it's meaningful (not just "triggers")
            label:
              payload.label && payload.label !== LoopEdgeLabel.Triggers
                ? payload.label
                : undefined,
            animated: true,
            type: LoopEdgeType.Smoothstep,
          }
          setEdges(eds => [...eds, newEdge])
          break
        }
        case LoopSuggestionKind.RemoveEdge: {
          const edgeId = suggestion.payload.id
          setEdges(eds => eds.filter(e => e.id !== edgeId))
          break
        }
        case LoopSuggestionKind.ModifyNode: {
          const { id, updates } = suggestion.payload
          setNodes(nds =>
            nds.map(n => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n))
          )
          break
        }
        case LoopSuggestionKind.ModifyEdge: {
          const { id, updates } = suggestion.payload
          setEdges(eds => eds.map(e => (e.id === id ? { ...e, ...updates } : e)))
          break
        }
        case LoopSuggestionKind.RemoveAllNodes: {
          console.log(LOOP_LOG_CLEAR_CANVAS)
          setNodes([])
          setEdges([])
          // Also clear metadata since we're starting fresh
          setLoopMetadata(null)
          setAnalysis(null)
          break
        }
      }

      // Remove the accepted suggestion
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))
    },
    [setNodes, setEdges]
  )

  const handleRejectSuggestion = useCallback((suggestion: Suggestion) => {
    console.log(LOOP_LOG_REJECT_SUGGESTION, suggestion.id)
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))
  }, [])

  const handleClearAllSuggestions = useCallback(() => {
    setSuggestions([])
  }, [])

  // Apply all suggestions at once, then auto-tidy the layout
  const handleAcceptAllSuggestions = useCallback(() => {
    console.log(LOOP_LOG_APPLY_ALL, suggestions.length)

    // Sort suggestions: nodes first, then edges (so edges can reference existing nodes)
    const sortedSuggestions = [...suggestions].sort(
      (a, b) => loopSuggestionSortOrder(a.type) - loopSuggestionSortOrder(b.type)
    )

    // Collect new nodes and edges
    let newNodes: Node[] = [...nodes]
    let newEdges: Edge[] = [...edges]

    for (const suggestion of sortedSuggestions) {
      switch (suggestion.type) {
        case LoopSuggestionKind.AddNode: {
          const payload = suggestion.payload
          const newNode: Node = {
            id:
              payload.id ||
              `${payload.nodeType}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
          newNodes = [...newNodes, newNode]
          break
        }
        case LoopSuggestionKind.AddEdge: {
          const payload = suggestion.payload
          const newEdge: Edge = {
            id: payload.id || `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            source: payload.source,
            target: payload.target,
            // Only show label if it's meaningful (not just "triggers")
            label:
              payload.label && payload.label !== LoopEdgeLabel.Triggers
                ? payload.label
                : undefined,
            animated: true,
            type: LoopEdgeType.Smoothstep,
          }
          newEdges = [...newEdges, newEdge]
          break
        }
        case LoopSuggestionKind.RemoveNode: {
          const nodeId = suggestion.payload.id
          newNodes = newNodes.filter(n => n.id !== nodeId)
          newEdges = newEdges.filter(e => e.source !== nodeId && e.target !== nodeId)
          break
        }
        case LoopSuggestionKind.RemoveEdge: {
          const edgeId = suggestion.payload.id
          newEdges = newEdges.filter(e => e.id !== edgeId)
          break
        }
        case LoopSuggestionKind.ModifyNode: {
          const { id, updates } = suggestion.payload
          newNodes = newNodes.map(n =>
            n.id === id ? { ...n, data: { ...n.data, ...updates } } : n
          )
          break
        }
        case LoopSuggestionKind.ModifyEdge: {
          const { id, updates } = suggestion.payload
          newEdges = newEdges.map(e => (e.id === id ? { ...e, ...updates } : e))
          break
        }
        case LoopSuggestionKind.RemoveAllNodes: {
          newNodes = []
          newEdges = []
          break
        }
      }
    }

    // Auto-tidy: arrange nodes following edge flow
    const tidiedNodes = tidyNodesLayout(newNodes, newEdges)

    setNodes(tidiedNodes)
    setEdges(newEdges)
    setSuggestions([])

    // Fit view after layout settles
    setTimeout(() => {
      rfInstance?.fitView({ padding: 0.2, duration: 300 })
    }, 100)

    console.log(LOOP_LOG_APPLIED_ALL)
  }, [suggestions, nodes, edges, setNodes, setEdges, rfInstance])

  // Smart tidy layout that follows edge connections for proper flow
  const tidyNodesLayout = useCallback((nodesToLayout: Node[], edgesToLayout: Edge[]): Node[] => {
    if (nodesToLayout.length === 0) return nodesToLayout

    const CARD_WIDTH = 240
    const CARD_HEIGHT = 180
    const GAP_X = 180 // Horizontal gap between nodes (increased for readability)
    const GAP_Y = 140 // Vertical gap for parallel branches (increased for readability)
    const START_X = 100
    const START_Y = 100

    // Separate groups from regular nodes
    const groups = nodesToLayout.filter(n => n.type === LoopFlowNodeType.Group)
    const regularNodes = nodesToLayout.filter(n => n.type !== LoopFlowNodeType.Group)

    if (regularNodes.length === 0) return nodesToLayout

    // Build adjacency maps from edges
    const outgoing: Record<string, string[]> = {}
    const incoming: Record<string, string[]> = {}

    for (const edge of edgesToLayout) {
      if (!outgoing[edge.source]) outgoing[edge.source] = []
      if (!incoming[edge.target]) incoming[edge.target] = []
      outgoing[edge.source].push(edge.target)
      incoming[edge.target].push(edge.source)
    }

    // Find root nodes (no incoming edges)
    const nodeIds = new Set(regularNodes.map(n => n.id))
    const roots = regularNodes.filter(n => {
      const incomingNodes = incoming[n.id] || []
      return incomingNodes.filter(id => nodeIds.has(id)).length === 0
    })

    // If no clear roots, use first node
    if (roots.length === 0 && regularNodes.length > 0) {
      roots.push(regularNodes[0])
    }

    // BFS to assign levels (columns) to nodes
    const nodeLevel: Record<string, number> = {}
    const nodeLane: Record<string, number> = {}
    const visited = new Set<string>()
    const queue: Array<{ id: string; level: number }> = []

    // Start from roots
    roots.forEach((root, index) => {
      queue.push({ id: root.id, level: 0 })
      nodeLane[root.id] = index
    })

    while (queue.length > 0) {
      const { id, level } = queue.shift()!
      if (visited.has(id)) continue
      visited.add(id)
      nodeLevel[id] = Math.max(nodeLevel[id] || 0, level)

      const children = outgoing[id] || []
      children.forEach((childId, index) => {
        if (nodeIds.has(childId) && !visited.has(childId)) {
          queue.push({ id: childId, level: level + 1 })
          // Assign lane based on parent lane and child index
          if (nodeLane[childId] === undefined) {
            nodeLane[childId] = (nodeLane[id] || 0) + (children.length > 1 ? index * 0.5 : 0)
          }
        }
      })
    }

    // Handle unvisited nodes (disconnected)
    let orphanLane = roots.length
    regularNodes.forEach(n => {
      if (!visited.has(n.id)) {
        nodeLevel[n.id] = 0
        nodeLane[n.id] = orphanLane++
      }
    })

    // Count nodes per level for centering
    const nodesPerLevel: Record<number, string[]> = {}
    regularNodes.forEach(n => {
      const level = nodeLevel[n.id] || 0
      if (!nodesPerLevel[level]) nodesPerLevel[level] = []
      nodesPerLevel[level].push(n.id)
    })

    // Position nodes based on level (x) and lane (y)
    const positionedNodes = regularNodes.map(node => {
      const level = nodeLevel[node.id] || 0
      const nodesAtLevel = nodesPerLevel[level] || []
      const indexAtLevel = nodesAtLevel.indexOf(node.id)

      // Center nodes vertically within their level
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
  }, [])

  // Node selection and editing handlers
  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const handleNodeUpdate = useCallback(
    (nodeId: string, updates: Record<string, unknown>) => {
      // Check if we need to change the node type
      const changeNodeType = readChangeNodeType(updates)
      delete updates._changeNodeType

      setNodes(nds =>
        nds.map(n => {
          if (n.id !== nodeId) return n

          const updatedNode = {
            ...n,
            data: { ...n.data, ...updates },
          }

          // If changing node type (e.g., challenge to action)
          if (changeNodeType) {
            updatedNode.type = changeNodeType
          }

          return updatedNode
        })
      )

      // Update selected node reference
      setSelectedNode(prev => {
        if (!prev || prev.id !== nodeId) return prev
        return {
          ...prev,
          data: { ...prev.data, ...updates },
          type: changeNodeType || prev.type,
        }
      })
    },
    [setNodes]
  )

  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      setNodes(nds => nds.filter(n => n.id !== nodeId))
      setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId))
      setSelectedNode(null)
    },
    [setNodes, setEdges]
  )

  // Node creation functions
  const createNode = useCallback(
    (nodeType: LoopNodeType | typeof CANVAS_NODE_TYPE_GROUP) => {
      const id = `${nodeType}-${Date.now()}`

      if (nodeType === CANVAS_NODE_TYPE_GROUP) {
        const newNode: Node = {
          id,
          type: LoopFlowNodeType.Group,
          position: { x: 100, y: 100 },
          style: {
            width: 500,
            height: 400,
            backgroundColor: LOOP_GROUP_BG_COLOR,
            borderColor: LOOP_GROUP_BORDER_COLOR,
            borderWidth: 2,
            borderStyle: LoopGroupBorderStyle.Dashed,
            borderRadius: 16,
          },
          data: {
            label: LOOP_CREATE_DEFAULT_LABELS[nodeType],
            timescale: LoopNodeTimescale.Custom,
            description: LOOP_CREATE_DEFAULT_DESCRIPTIONS[nodeType],
          },
        }
        setNodes(nds => [...nds, newNode])
      } else {
        const newNode: Node = {
          id,
          type: LOOP_DOMAIN_TO_FLOW_NODE[nodeType],
          position: { x: 200, y: 200 },
          data: {
            label: LOOP_CREATE_DEFAULT_LABELS[nodeType],
            description: LOOP_CREATE_DEFAULT_DESCRIPTIONS[nodeType],
            nodeType,
            timescale: LoopNodeTimescale.Custom,
            duration: '',
            playerAgency: LoopPlayerAgencyLevel.Medium,
          },
        }
        setNodes(nds => [...nds, newNode])
      }
    },
    [setNodes]
  )

  const onImportJson = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = e => {
        try {
          const content = fileReaderText(e.target?.result ?? null)
          if (!content) return
          const data = JSON.parse(content)

          let transformedNodes: Node[] = []
          if (data.nodes) {
            transformedNodes = data.nodes.map((node: any) => ({
              ...node,
              // Convert parentNode to parentId for @xyflow/react v12
              parentId: node.parentNode || node.parentId,
              parentNode: undefined, // Remove deprecated property
              draggable: node.type !== LoopFlowNodeType.Group,
            }))
            // Automatically tidy up imported nodes
            transformedNodes = autoLayoutNodes(transformedNodes, data.edges || [])
            setNodes(transformedNodes)
          }

          if (data.edges) {
            const transformedEdges = data.edges.map((edge: any) => ({
              ...edge,
              type: LoopEdgeType.Smoothstep,
              // For vertical flow: source from bottom, target to top
              sourcePosition: LoopFlowPosition.Bottom,
              targetPosition: LoopFlowPosition.Top,
              labelBgStyle: { fill: LOOP_IMPORT_EDGE_LABEL_BG, fillOpacity: 0.9 },
              labelBgPadding: [6, 10],
              labelBgBorderRadius: 6,
              labelStyle: { fill: LOOP_IMPORT_EDGE_LABEL_FILL, fontSize: 11, fontWeight: 500 },
            }))
            setEdges(transformedEdges)
          }

          if (data.metadata) {
            setLoopMetadata(data.metadata)
            setGameContext(prev => ({
              ...prev,
              gameGenre: data.metadata.genre?.join(LOOP_GENRE_JOIN) || prev.gameGenre,
              gameDescription: data.metadata.description || prev.gameDescription,
            }))
          }

          if (data.analysis) {
            setAnalysis(data.analysis)
          }

          // Save imported loop to database
          const loopName = data.metadata?.name || file.name.replace(LOOP_JSON_EXTENSION, '')
          createNewLoop(loopName, transformedNodes, data.edges || [], data.metadata, data.analysis)

          // Fit view after a small delay to allow nodes to render
          setTimeout(() => {
            if (rfInstance) {
              rfInstance.fitView({ padding: 0.1, duration: 800 })
            }
          }, 200)
        } catch (error) {
          console.error(LOOP_LOG_JSON_PARSE_ERROR, error)
          alert(LOOP_JSON_PARSE_ALERT)
        }
      }
      reader.readAsText(file)
      // Reset file input
      event.target.value = ''
    },
    [setNodes, setEdges, rfInstance, createNewLoop]
  )

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges(eds =>
        addEdge({ ...params, animated: true, style: { stroke: LOOP_CONNECTION_STROKE } }, eds)
      ),
    [setEdges]
  )

  const {
    messages,
    setMessages,
    isSending,
    sendMessage,
    thinkingAgent,
    stopStream,
    streamingTokens,
    isTokenStreaming,
    activeAgents,
    streamingSections,
    groundingScore,
  } = useChatStream({
    // Langfuse session tracking for loop-creator domain
    projectId,
    initialMessages: [
      {
        sender: NEXT_AGENT_SUPERVISOR,
        content: `👋 Hello! I'm your Game Loop Design Assistant. I coordinate a team of specialists to help you create engaging game mechanics and loops.

**My team includes:**
- 🎯 **Loop Planner** - Designs overall loop structure
- ⚙️ **Mechanics Designer** - Creates individual mechanics
- ⚖️ **Balance Analyst** - Evaluates effort/reward balance
- 📈 **Progression Architect** - Designs progression systems

To get started, tell me about the game you're designing. What **genre** and **platform** are you targeting?`,
        type: LoopChatMessageType.Ai,
      },
    ],
    onStreamingUpdate: data => {
      const stateCounts = parseLoopStreamStateCounts(data)
      if (stateCounts && (stateCounts.mechanics > 0 || stateCounts.loops > 0)) {
        console.log(
          `[LoopCreator] State update: ${stateCounts.mechanics} mechanics, ${stateCounts.loops} loops`
        )
      }
      const thread = parseLoopStreamThreadId(data)
      if (thread) {
        setThreadId(thread)
      }
    },
    onAction: async action => {
      // Handle actions from the loop creator graph
      console.log(LOOP_LOG_ACTION_RECEIVED, action.type, action.payload)

      const createSuggestionId = () =>
        `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Convert actions to suggestions for user approval
      switch (action.type) {
        case LoopLayoutAgentAction.AddMechanic: {
          const mechanic = parseMechanicPayload(action.payload)
          if (!mechanic) break
          const suggestion: Suggestion = {
            id: createSuggestionId(),
            type: LoopSuggestionKind.AddNode,
            description: `Add "${mechanic.name}" ${mechanic.type || LOOP_MECHANIC_LABEL_SUFFIX} node`,
            payload: {
              id: mechanic.id || `mechanic-${Date.now()}`,
              label: mechanic.name,
              description: mechanic.description || '',
              nodeType:
                mechanic.type === LoopMechanicKind.Core
                  ? LoopNodeType.Challenge
                  : LoopNodeType.Action,
              position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
            },
          }
          setSuggestions(prev => [...prev, suggestion])
          break
        }

        case LoopLayoutAgentAction.AddConnection:
        case LoopLayoutAgentAction.AddEdge: {
          const conn = parseConnectionPayload(action.payload)
          if (!conn) break
          const suggestion: Suggestion = {
            id: createSuggestionId(),
            type: LoopSuggestionKind.AddEdge,
            description: `Connect "${conn.sourceLabel || conn.source}" → "${conn.targetLabel || conn.target}"${conn.label ? ` (${conn.label})` : ''}`,
            payload: {
              id: conn.id || `edge-${Date.now()}`,
              source: conn.source,
              target: conn.target,
              label: conn.label,
            },
          }
          setSuggestions(prev => [...prev, suggestion])
          break
        }

        case LoopLayoutAgentAction.AddNode: {
          const node = parseAddNodePayload(action.payload)
          if (!node) break
          const suggestion: Suggestion = {
            id: createSuggestionId(),
            type: LoopSuggestionKind.AddNode,
            description: `Add "${node.label}" node`,
            payload: {
              id: node.id || `node-${Date.now()}`,
              label: node.label,
              description: node.description || '',
              nodeType: node.nodeType || LoopNodeType.Action,
              position: node.position || {
                x: Math.random() * 400 + 100,
                y: Math.random() * 300 + 100,
              },
            },
          }
          setSuggestions(prev => [...prev, suggestion])
          break
        }

        case LoopLayoutAgentAction.RemoveNode: {
          const payload = parseIdPayload(action.payload)
          if (!payload) break
          const nodeId = payload.id
          const nodeToRemove = nodes.find(n => n.id === nodeId)
          const suggestion: Suggestion = {
            id: createSuggestionId(),
            type: LoopSuggestionKind.RemoveNode,
            description: `Remove "${nodeToRemove?.data?.label || nodeId}" node`,
            payload: { id: nodeId },
          }
          setSuggestions(prev => [...prev, suggestion])
          break
        }

        case LoopLayoutAgentAction.RemoveAllNodes: {
          const suggestion: Suggestion = {
            id: createSuggestionId(),
            type: LoopSuggestionKind.RemoveAllNodes,
            description: `Clear all nodes and edges from canvas (${nodes.length} nodes, ${edges.length} edges)`,
            payload: {},
          }
          setSuggestions(prev => [...prev, suggestion])
          break
        }

        case LoopLayoutAgentAction.ModifyNode: {
          const modify = parseModifyNodePayload(action.payload)
          if (!modify) break
          const { id, updates } = modify
          const nodeToModify = nodes.find(n => n.id === id)
          const suggestion: Suggestion = {
            id: createSuggestionId(),
            type: LoopSuggestionKind.ModifyNode,
            description: `Update "${nodeToModify?.data?.label || id}": ${Object.keys(updates).join(LOOP_MODIFY_NODE_JOIN)}`,
            payload: { id, updates },
          }
          setSuggestions(prev => [...prev, suggestion])
          break
        }

        case LoopLayoutAgentAction.RemoveEdge: {
          const payload = parseIdPayload(action.payload)
          if (!payload) break
          const edgeId = payload.id
          const suggestion: Suggestion = {
            id: createSuggestionId(),
            type: LoopSuggestionKind.RemoveEdge,
            description: `Remove connection "${edgeId}"`,
            payload: { id: edgeId },
          }
          setSuggestions(prev => [...prev, suggestion])
          break
        }

        case LoopLayoutAgentAction.MarketAnalysisComplete: {
          // When market analysis is done via chat, open the panel and refresh it
          console.log(LOOP_LOG_MARKET_ANALYSIS_OPEN)
          setMarketAnalysisKey(prev => prev + 1) // Force panel refresh
          setIsMarketAnalysisOpen(true)
          break
        }

        default:
          console.log(LOOP_LOG_UNKNOWN_ACTION, action.type)
      }
    },
  })

  const handleSendMessage = useCallback(
    async (msg: string) => {
      if (!msg.trim()) return

      // Optimistic update
      setMessages(prev => [
        ...prev,
        { sender: LoopCreatorAgentKey.User, content: msg, type: LoopChatMessageType.Human },
      ])

      const recentMessages = messages
        .slice(-10)
        .map(m => ({
          role: m.type === LoopChatMessageType.Human ? LoopLlmRole.User : LoopLlmRole.Assistant,
          content: typeof m.content === 'string' ? m.content : '',
        }))
        .filter(m => m.content.length > 0)

      await sendMessage('/api/loop-creator/chat', {
        message: msg,
        projectId,
        threadId, // Continue conversation if we have a threadId
        recentMessages: recentMessages.length ? recentMessages : undefined,
        context: {
          ...gameContext,
          nodes: nodes.map(n => ({
            id: n.id,
            label: n.data?.label,
            type: n.type,
            data: n.data, // Include full data for description, nodeType, etc.
          })),
          edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, label: e.label })),
        },
      })
    },
    [projectId, threadId, sendMessage, setMessages, nodes, edges, gameContext, messages]
  )

  // Effect to send pending auto-message when a loop is created
  useEffect(() => {
    if (pendingAutoMessage && currentLoopId && !isSending) {
      console.log(LOOP_LOG_SEND_AUTO_MESSAGE, pendingAutoMessage.slice(0, 50) + LOOP_LOG_AUTO_MESSAGE_SUFFIX)
      handleSendMessage(pendingAutoMessage)
      setPendingAutoMessage(null)
    }
  }, [pendingAutoMessage, currentLoopId, isSending, handleSendMessage])

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden font-sans">
      <div className="flex flex-1 overflow-hidden">
        {/* Main Content - React Flow Diagram */}
        <main className="flex flex-1 flex-col overflow-hidden relative">
          <header className="flex h-14 items-center justify-between border-b px-6 bg-card/50">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold">Loop Creator</h1>
              <div id={TOUR_STEP_IDS.LOOP_SELECTOR}>
                <LoopSelector
                  projectId={projectId}
                  currentLoopId={currentLoopId}
                  onLoopChange={handleLoopChange}
                  onCreateLoop={handleCreateLoopFromSelector}
                  onReset={handleReset}
                  externalOpenDialog={showCreateLoopDialog}
                  onExternalOpenDialogChange={setShowCreateLoopDialog}
                  onLoopCreated={handleLoopCreatedWithConcept}
                />
              </div>
              {loopMetadata && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  {loopMetadata.name} v{loopMetadata.version}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground mr-4">
                <span>{nodes.length} nodes</span>
                <span>{edges.length} edges</span>
                {groundingScore !== null && (
                  <span className="text-emerald-500">
                    Grounding: {Math.round(groundingScore * 100)}%
                  </span>
                )}

                {/* Auto-save status indicator */}
                {currentLoopId && (
                  <div className="flex items-center gap-1.5">
                    {saveStatus.status === 'saving' && (
                      <>
                        <Cloud className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                        <span className="text-xs text-blue-400">Saving...</span>
                      </>
                    )}
                    {saveStatus.status === 'saved' && (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs text-emerald-400">Saved</span>
                      </>
                    )}
                    {saveStatus.status === 'error' && (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-xs text-red-400">Save failed</span>
                      </>
                    )}
                    {saveStatus.status === 'idle' && saveStatus.lastSaved && (
                      <span className="text-xs text-muted-foreground/60">Synced</span>
                    )}
                  </div>
                )}
              </div>

              {analysis && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 h-8">
                      <Info className="w-4 h-4" />
                      Analysis
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl bg-[#0d0d14] border-slate-800 text-slate-200">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-cyan-400" />
                        Loop Analysis: {loopMetadata?.name}
                      </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh] pr-4">
                      <div className="space-y-6 py-4">
                        {analysis.coreInsight && (
                          <div className="p-4 rounded-lg bg-cyan-950/20 border border-cyan-500/30">
                            <p className="text-cyan-400 italic font-medium text-sm leading-relaxed">
                              "{analysis.coreInsight}"
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <h3 className="text-xs font-bold text-white uppercase tracking-widest text-slate-500">
                              Five Pillars
                            </h3>
                            <div className="space-y-4">
                              {analysis.pillarScores &&
                                Object.entries(analysis.pillarScores).map(
                                  ([pillar, score]: [string, any]) => (
                                    <div key={pillar} className="space-y-2">
                                      <div className="flex justify-between text-[10px] uppercase font-bold tracking-tight text-slate-400">
                                        <span>{pillar}</span>
                                        <span className="text-cyan-400">{score}/10</span>
                                      </div>
                                      <div className="h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/30">
                                        <div
                                          className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-1000"
                                          style={{ width: `${score * 10}%` }}
                                        />
                                      </div>
                                    </div>
                                  )
                                )}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h3 className="text-xs font-bold text-white uppercase tracking-widest text-slate-500">
                              Key Innovations
                            </h3>
                            <ul className="space-y-3">
                              {analysis.keyInnovations?.map((item: string, i: number) => (
                                <li
                                  key={i}
                                  className="text-xs text-slate-300 flex gap-3 leading-relaxed"
                                >
                                  <span className="text-cyan-500 font-bold">0{i + 1}.</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-800/50">
                          <div className="space-y-3">
                            <h3 className="text-xs font-bold text-white uppercase tracking-widest text-slate-500">
                              Design Lessons
                            </h3>
                            <ul className="space-y-2">
                              {analysis.designLessons?.map((item: string, i: number) => (
                                <li
                                  key={i}
                                  className="text-xs text-slate-300 flex gap-2 items-start"
                                >
                                  <span className="text-emerald-500 mt-0.5">💡</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="space-y-3">
                            <h3 className="text-xs font-bold text-white uppercase tracking-widest text-slate-500">
                              Loop Strengths
                            </h3>
                            <ul className="space-y-2">
                              {analysis.loopStrengths?.map((item: string, i: number) => (
                                <li
                                  key={i}
                                  className="text-xs text-slate-300 flex gap-2 items-start"
                                >
                                  <span className="text-blue-500 mt-0.5">✓</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              )}

              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-8 border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-400"
                onClick={handleTidyUp}
              >
                <Wand2 className="w-4 h-4" />
                Tidy Up
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-8 border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-400"
                onClick={() => setIsMarketAnalysisOpen(true)}
              >
                <Search className="w-4 h-4" />
                Market Analysis
              </Button>

              <div className="flex items-center">
                <input
                  type="file"
                  id="json-import"
                  accept=".json"
                  className="hidden"
                  onChange={onImportJson}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-primary/10 border-primary/20 hover:bg-primary/20 transition-colors h-8"
                  onClick={() => document.getElementById('json-import')?.click()}
                >
                  <Upload className="w-4 h-4" />
                  Import JSON
                </Button>
              </div>
            </div>
          </header>

          {/* Node Creation Toolbar */}
          <div className="flex items-center gap-2 px-6 py-2 border-b bg-card/30">
            <span className="text-xs text-muted-foreground mr-2">Add:</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 gap-1.5 text-xs hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/30"
              onClick={() => createNode(LoopNodeType.Challenge)}
            >
              <Swords className="w-3.5 h-3.5 text-red-400" />
              Challenge
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 gap-1.5 text-xs hover:bg-blue-500/10 hover:text-blue-400 border border-transparent hover:border-blue-500/30"
              onClick={() => createNode(LoopNodeType.Action)}
            >
              <Gamepad2 className="w-3.5 h-3.5 text-blue-400" />
              Action
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 gap-1.5 text-xs hover:bg-yellow-500/10 hover:text-yellow-400 border border-transparent hover:border-yellow-500/30"
              onClick={() => createNode(LoopNodeType.Reward)}
            >
              <Star className="w-3.5 h-3.5 text-yellow-400" />
              Reward
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 gap-1.5 text-xs hover:bg-green-500/10 hover:text-green-400 border border-transparent hover:border-green-500/30"
              onClick={() => createNode(LoopNodeType.Feedback)}
            >
              <BarChart3 className="w-3.5 h-3.5 text-green-400" />
              Feedback
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 gap-1.5 text-xs hover:bg-purple-500/10 hover:text-purple-400 border border-transparent hover:border-purple-500/30"
              onClick={() => createNode(CANVAS_NODE_TYPE_GROUP)}
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              Group
            </Button>
          </div>

          <div className="flex-1 overflow-hidden p-4 relative">
            <div className="absolute inset-0 p-4">
              <div className="h-full w-full rounded-xl border bg-card/50 shadow-inner overflow-hidden relative">
                <div className="absolute inset-0 bg-slate-950/20" id={TOUR_STEP_IDS.LOOP_CANVAS}>
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onInit={setRfInstance}
                    onNodeClick={handleNodeClick}
                    onPaneClick={handlePaneClick}
                    nodeTypes={nodeTypes}
                    fitView
                    className="bg-background"
                    connectionLineType={ConnectionLineType.SmoothStep}
                    defaultEdgeOptions={{
                      type: 'smoothstep',
                      animated: true,
                      style: {
                        stroke: '#6366f1',
                        strokeWidth: 2,
                      },
                      markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: '#6366f1',
                        width: 20,
                        height: 20,
                      },
                      labelStyle: {
                        fill: '#94a3b8',
                        fontSize: 10,
                        fontWeight: 500,
                      },
                      labelBgStyle: {
                        fill: '#0f172a',
                        fillOpacity: 0.9,
                      },
                      labelBgPadding: EDGE_LABEL_BG_PADDING,
                      labelBgBorderRadius: 4,
                    }}
                  >
                    <Background
                      variant={BackgroundVariant.Dots}
                      gap={12}
                      size={1}
                      color="#334155"
                    />
                    <Controls className="bg-muted text-muted-foreground border-border" />
                  </ReactFlow>
                </div>

                {/* AI Suggestion Panel */}
                <div id={TOUR_STEP_IDS.LOOP_SUGGESTIONS}>
                  <SuggestionPanel
                    suggestions={suggestions}
                    onAccept={handleAcceptSuggestion}
                    onReject={handleRejectSuggestion}
                    onClearAll={handleClearAllSuggestions}
                    onAcceptAll={handleAcceptAllSuggestions}
                  />
                </div>

                {/* Properties Panel for editing nodes */}
                <PropertiesPanel
                  selectedNode={selectedNode}
                  onClose={() => setSelectedNode(null)}
                  onUpdate={handleNodeUpdate}
                  onDelete={handleNodeDelete}
                />

                {/* Empty State - No loop selected */}
                {!currentLoopId && !isTourActive && <LoopEmptyState onCreateLoop={handleCreateLoopFromEmptyState} />}
              </div>
            </div>
          </div>
        </main>

        {/* RIGHT Sidebar - Chat Interface (Resizable) */}
        <DomainSidebar
          header={null}
          storageKey="loop-creator-chat"
          defaultWidth={420}
          position="right"
          rawContent
          className="bg-card/30"
        >
          <div className="flex flex-col h-full" id={TOUR_STEP_IDS.LOOP_CHAT}>
            {/* Active Agents Display - Only when Activity ON */}
            {isActivityPanelOpen && activeAgents.length > 0 && (
              <div className="px-4 py-2 border-b bg-card/30">
                <ActiveAgentsPanel activeAgents={activeAgents} agentConfig={LOOP_AGENT_CONFIG} />
              </div>
            )}

            {/* Section Progress - Only when Activity ON */}
            {isActivityPanelOpen && streamingSections.length > 0 && (
              <div className="px-4 py-2 border-b">
                <SectionProgress
                  sections={streamingSections}
                  title="Progress"
                  collapsible
                  defaultExpanded={false}
                />
              </div>
            )}

            <div className="flex-1 overflow-hidden">
              <ChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                isSending={isSending}
                agentConfig={LOOP_AGENT_CONFIG}
                onStopStream={stopStream}
                isActivityPanelOpen={isActivityPanelOpen}
                onActivityToggle={() => setIsActivityPanelOpen(!isActivityPanelOpen)}
                isAdmin={isAdminUser(userEmail)}
                thinkingAgent={thinkingAgent}
                streamingTokens={streamingTokens}
                projectId={projectId}
                showThinking={!!thinkingAgent}
                currentPhase="loop_design"
                mentionProviders={mentionProviders}
                projectContext={projectContextForMentions}
              >
                {/* Streaming Terminal - Only when Activity ON */}
                {isActivityPanelOpen && isTokenStreaming && streamingTokens && (
                  <div className="mb-4 animate-in fade-in duration-300">
                    <StreamingTerminal
                      streamingTokens={streamingTokens}
                      thinkingAgent={thinkingAgent}
                    />
                  </div>
                )}

                {/* Streaming Sections Inline - Only when Activity ON */}
                {isActivityPanelOpen && streamingSections.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <StreamingSectionsInline sections={streamingSections} />
                  </div>
                )}

                {/* Cross-Domain Entity Selector - SWISS ARMY KNIFE FEATURE */}
                {!isSending && !isTokenStreaming && currentLoopId && (
                  <div className="mt-4 border-t border-border/10 pt-4 px-4 pb-2">
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <Layers className="w-3 h-3 text-purple-400" />
                      <span className="text-[10px] text-muted-foreground/80 font-medium uppercase tracking-widest">
                        Cross-Domain Entities
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 bg-purple-500/10 text-purple-400 border-purple-500/30"
                      >
                        NEW
                      </Badge>
                    </div>
                    <div className="px-1 mb-3">
                      <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                        Reference characters, locations, and other entities from Storyteller and
                        other domains
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 px-1">
                      <EntitySelectorButton
                        projectId={projectId}
                        onSelectEntity={entity => {
                          const message = `Design mechanics for @${entity.name} (${entity.entityType} from ${entity.sourceDomain})`
                          handleSendMessage(message)
                        }}
                        filterType="character"
                        label="Add Character"
                      />
                      <EntitySelectorButton
                        projectId={projectId}
                        onSelectEntity={entity => {
                          const message = `Create gameplay for @${entity.name} (${entity.entityType})`
                          handleSendMessage(message)
                        }}
                        filterType="location"
                        label="Add Location"
                      />
                      <EntitySelectorButton
                        projectId={projectId}
                        onSelectEntity={entity => {
                          const message = `Reference @${entity.name} in this loop design`
                          handleSendMessage(message)
                        }}
                        label="Browse All"
                      />
                    </div>
                  </div>
                )}

                {/* Smart Quick Actions - Always render container for tour selector */}
                <div id={TOUR_STEP_IDS.LOOP_QUICK_ACTIONS} className="mt-4 border-t border-border/10 pt-4 px-4 pb-2">
                  {!isSending && !isTokenStreaming && currentLoopId ? (
                    <>
                      <div className="flex items-center gap-2 mb-1.5 px-1">
                        <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-widest">
                          Suggested
                        </span>
                      </div>
                      <SmartQuickActions
                        currentPhase="loop_design"
                        onSendMessage={handleSendMessage}
                        proposeLabel="Analyze loops"
                        proposePrompt="Analyze the current game loops and suggest improvements or next steps."
                      />
                    </>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-xs text-muted-foreground">
                        Quick actions appear when a loop is selected
                      </p>
                    </div>
                  )}
                </div>

                {/* No Loop Selected Message */}
                {!currentLoopId && !isSending && (
                  <div className="mt-4 px-4 pb-4">
                    <div className="text-center p-4 rounded-lg bg-muted/30 border border-border/50">
                      <p className="text-sm text-muted-foreground mb-2">
                        Create a loop to start chatting with AI
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCreateLoopFromEmptyState}
                        className="gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create Loop
                      </Button>
                    </div>
                  </div>
                )}
              </ChatInterface>
            </div>
          </div>
        </DomainSidebar>
      </div>

      {/* Market Analysis Panel */}
      <MarketAnalysisPanel
        key={`market-analysis-${marketAnalysisKey}`}
        isOpen={isMarketAnalysisOpen}
        onClose={() => setIsMarketAnalysisOpen(false)}
        nodes={nodes}
        edges={edges}
        gameLoopId={currentLoopId}
        gameContext={gameContext}
      />
    </div>
  )
}
