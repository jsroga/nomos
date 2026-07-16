'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import { useChatStream, getGameEntityProvider } from '@/shared/chat'
import {
  getLoopCreatorMentionProviders,
  buildLoopCreatorProjectContext,
} from '@/domains/loop-creator/core/mentions/providers'
import { autoLayoutNodes } from '@/domains/loop-creator/core/layout'
import {
  nodeDescription,
  nodeLabel,
  readChangeNodeType,
  fileReaderText,
} from '@/domains/loop-creator/core/loop-node-wire'
import {
  parseLoopStreamStateCounts,
  parseLoopStreamThreadId,
} from '@/domains/loop-creator/core/loop-agent-action-wire'
import { LoopNodeType } from '@/domains/loop-creator/constants/custom-nodes'
import {
  CANVAS_NODE_TYPE_GROUP,
  NEXT_AGENT_SUPERVISOR,
} from '@/domains/loop-creator/constants/graph-state-defaults'
import { LoopHttpMethod } from '@/domains/loop-creator/constants/loop-http'
import { useTour } from '@/components/shell/Tour'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { useAutoSave } from '@/domains/loop-creator/state/useAutoSave'
import type { PersistedGameLoop } from '@/domains/loop-creator/ui/components/LoopSelector'
import { Suggestion } from '@/domains/loop-creator/ui/components/SuggestionPanel'
import {
  LoopCanvasKind,
  LoopChatMessageType,
  LoopCreatorAgentKey,
  LoopLlmRole,
  LoopSuggestionKind,
  LOOP_CONNECTION_STROKE,
  LOOP_CREATE_FAILED_ERROR,
  LOOP_GENRE_JOIN,
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
} from '@/domains/loop-creator/ui/constants/loop-creator-layout'
import {
  EMPTY_LOOP_GAME_CONTEXT,
  type LoopGameContext,
} from '@/domains/loop-creator/ui/types/loop-layout-wires'
import { createCanvasNode } from '@/domains/loop-creator/ui/utils/create-canvas-node'
import { mapLoopAgentActionToEffects } from '@/domains/loop-creator/ui/utils/loop-agent-action-handler'
import {
  gameContextPatchFromImport,
  parseLoopImportFile,
} from '@/domains/loop-creator/ui/utils/loop-import-json'
import {
  applyAllSuggestionsToGraph,
  applySuggestionToGraph,
} from '@/domains/loop-creator/ui/utils/suggestion-graph'
import {
  persistedEdgesFromUnknown,
  persistedNodesFromUnknown,
} from '@/domains/loop-creator/ui/utils/persisted-graph'

function createSuggestionId(): string {
  return `suggestion-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export function useLoopCreatorLayout(projectId: string) {
  const { currentStep } = useTour()
  const isTourActive = currentStep >= 0
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [threadId, setThreadId] = useState<string | null>(null)
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)
  const [loopMetadata, setLoopMetadata] = useState<unknown | null>(null)
  const [analysis, setAnalysis] = useState<unknown | null>(null)
  const [isActivityPanelOpen, setIsActivityPanelOpen] = useState(false)
  const [currentLoopId, setCurrentLoopId] = useState<string | null>(null)
  const [gameContext, setGameContext] = useState<LoopGameContext>(EMPTY_LOOP_GAME_CONTEXT)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [isMarketAnalysisOpen, setIsMarketAnalysisOpen] = useState(false)
  const [marketAnalysisKey, setMarketAnalysisKey] = useState(0)
  const [showCreateLoopDialog, setShowCreateLoopDialog] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [pendingAutoMessage, setPendingAutoMessage] = useState<string | null>(null)

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
    setNodes(nds => autoLayoutNodes(nds, edges))
    setTimeout(() => {
      rfInstance?.fitView({ padding: 0.1, duration: 800 })
    }, 100)
  }, [edges, setNodes, rfInstance])

  const mentionProviders = useMemo(
    () => [...getLoopCreatorMentionProviders(), getGameEntityProvider()],
    [],
  )

  const projectContextForMentions = useMemo(
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
    [projectId, nodes, edges, analysis, gameContext],
  )

  const createNewLoop = useCallback(
    async (
      name: string,
      importedNodes?: Node[],
      importedEdges?: Edge[],
      importedMetadata?: unknown,
      importedAnalysis?: unknown,
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

        if (!response.ok) throw new Error(LOOP_CREATE_FAILED_ERROR)

        const newLoop: PersistedGameLoop = await response.json()
        setCurrentLoopId(newLoop.id)
        console.log(LOOP_LOG_LOOP_CREATED, newLoop.id)
        return newLoop
      } catch (error) {
        console.error(LOOP_LOG_CREATE_FAILED, error)
        return null
      }
    },
    [projectId, nodes, edges, loopMetadata, analysis],
  )

  const handleLoopChange = useCallback(
    (loop: PersistedGameLoop | null) => {
      if (loop) {
        setNodes(persistedNodesFromUnknown(loop.nodes))
        setEdges(persistedEdgesFromUnknown(loop.edges))
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
    [setNodes, setEdges],
  )

  const handleReset = useCallback(() => {
    setNodes([])
    setEdges([])
    setLoopMetadata(null)
    setAnalysis(null)
    setSuggestions([])
    setSelectedNode(null)
    console.log(LOOP_LOG_CANVAS_RESET)
  }, [setNodes, setEdges])

  const handleCreateLoopFromSelector = useCallback(
    async (name: string, gameConcept?: string) => {
      if (gameConcept) {
        setGameContext((prev: LoopGameContext) => ({ ...prev, gameDescription: gameConcept }))
      }
      return createNewLoop(name, [], [])
    },
    [createNewLoop],
  )

  const handleCreateLoopFromEmptyState = useCallback(() => {
    setShowCreateLoopDialog(true)
  }, [])

  const handleLoopCreatedWithConcept = useCallback((_loop: PersistedGameLoop, gameConcept: string) => {
    console.log(LOOP_LOG_AUTO_START, gameConcept)
    setGameContext((prev: LoopGameContext) => ({ ...prev, gameDescription: gameConcept }))
    setPendingAutoMessage(
      `I want to create a game like this: ${gameConcept}\n\nPlease design the core game loop nodes and mechanics for this concept.`,
    )
  }, [])

  const handleAcceptSuggestion = useCallback(
    (suggestion: Suggestion) => {
      console.log(LOOP_LOG_ACCEPT_SUGGESTION, suggestion.type, suggestion.payload)
      if (suggestion.type === LoopSuggestionKind.RemoveAllNodes) console.log(LOOP_LOG_CLEAR_CANVAS)

      const result = applySuggestionToGraph(suggestion, nodes, edges)
      setNodes(result.nodes)
      setEdges(result.edges)
      if (result.clearMetadata) {
        setLoopMetadata(null)
        setAnalysis(null)
      }
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))
    },
    [nodes, edges, setNodes, setEdges],
  )

  const handleRejectSuggestion = useCallback((suggestion: Suggestion) => {
    console.log(LOOP_LOG_REJECT_SUGGESTION, suggestion.id)
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))
  }, [])

  const handleClearAllSuggestions = useCallback(() => {
    setSuggestions([])
  }, [])

  const handleAcceptAllSuggestions = useCallback(() => {
    console.log(LOOP_LOG_APPLY_ALL, suggestions.length)
    const result = applyAllSuggestionsToGraph(suggestions, nodes, edges)
    setNodes(result.nodes)
    setEdges(result.edges)
    if (result.clearMetadata) {
      setLoopMetadata(null)
      setAnalysis(null)
    }
    setSuggestions([])
    setTimeout(() => {
      rfInstance?.fitView({ padding: 0.2, duration: 300 })
    }, 100)
    console.log(LOOP_LOG_APPLIED_ALL)
  }, [suggestions, nodes, edges, setNodes, setEdges, rfInstance])

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const handleNodeUpdate = useCallback(
    (nodeId: string, updates: Record<string, unknown>) => {
      const changeNodeType = readChangeNodeType(updates)
      delete updates._changeNodeType

      setNodes(nds =>
        nds.map(n => {
          if (n.id !== nodeId) return n
          const updatedNode = { ...n, data: { ...n.data, ...updates } }
          if (changeNodeType) updatedNode.type = changeNodeType
          return updatedNode
        }),
      )

      setSelectedNode(prev => {
        if (!prev || prev.id !== nodeId) return prev
        return {
          ...prev,
          data: { ...prev.data, ...updates },
          type: changeNodeType || prev.type,
        }
      })
    },
    [setNodes],
  )

  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      setNodes(nds => nds.filter(n => n.id !== nodeId))
      setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId))
      setSelectedNode(null)
    },
    [setNodes, setEdges],
  )

  const createNode = useCallback(
    (nodeType: LoopNodeType | typeof CANVAS_NODE_TYPE_GROUP) => {
      setNodes(nds => [...nds, createCanvasNode(nodeType)])
    },
    [setNodes],
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

          const imported = parseLoopImportFile(
            content,
            file.name,
            LOOP_JSON_EXTENSION,
            LOOP_GENRE_JOIN,
            LOOP_IMPORT_EDGE_LABEL_BG,
            LOOP_IMPORT_EDGE_LABEL_FILL,
          )
          if (!imported) {
            alert(LOOP_JSON_PARSE_ALERT)
            return
          }

          setNodes(imported.nodes)
          setEdges(imported.edges)
          if (imported.metadata) setLoopMetadata(imported.metadata)
          if (imported.analysis) setAnalysis(imported.analysis)

          const contextPatch = gameContextPatchFromImport(imported)
          if (Object.keys(contextPatch).length > 0) {
            setGameContext((prev: LoopGameContext) => ({ ...prev, ...contextPatch }))
          }

          createNewLoop(
            imported.loopName,
            imported.nodes,
            imported.edges,
            imported.metadata,
            imported.analysis,
          )

          setTimeout(() => {
            rfInstance?.fitView({ padding: 0.1, duration: 800 })
          }, 200)
        } catch (error) {
          console.error(LOOP_LOG_JSON_PARSE_ERROR, error)
          alert(LOOP_JSON_PARSE_ALERT)
        }
      }
      reader.readAsText(file)
      event.target.value = ''
    },
    [setNodes, setEdges, rfInstance, createNewLoop],
  )

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges(eds =>
        addEdge({ ...params, animated: true, style: { stroke: LOOP_CONNECTION_STROKE } }, eds),
      ),
    [setEdges],
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
          `[LoopCreator] State update: ${stateCounts.mechanics} mechanics, ${stateCounts.loops} loops`,
        )
      }
      const thread = parseLoopStreamThreadId(data)
      if (thread) setThreadId(thread)
    },
    onAction: async action => {
      console.log(LOOP_LOG_ACTION_RECEIVED, action.type, action.payload)
      const effects = mapLoopAgentActionToEffects(action, {
        nodes,
        edges,
        createSuggestionId,
      })
      if (effects.suggestions.length > 0) {
        setSuggestions(prev => [...prev, ...effects.suggestions])
      }
      if (effects.openMarketAnalysis) {
        console.log(LOOP_LOG_MARKET_ANALYSIS_OPEN)
        setMarketAnalysisKey(prev => prev + 1)
        setIsMarketAnalysisOpen(true)
      }
      if (effects.unknownActionType) {
        console.log(LOOP_LOG_UNKNOWN_ACTION, effects.unknownActionType)
      }
    },
  })

  const handleSendMessage = useCallback(
    async (msg: string) => {
      if (!msg.trim()) return

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
        threadId,
        recentMessages: recentMessages.length ? recentMessages : undefined,
        context: {
          ...gameContext,
          nodes: nodes.map(n => ({
            id: n.id,
            label: n.data?.label,
            type: n.type,
            data: n.data,
          })),
          edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, label: e.label })),
        },
      })
    },
    [projectId, threadId, sendMessage, setMessages, nodes, edges, gameContext, messages],
  )

  useEffect(() => {
    if (pendingAutoMessage && currentLoopId && !isSending) {
      console.log(
        LOOP_LOG_SEND_AUTO_MESSAGE,
        pendingAutoMessage.slice(0, 50) + LOOP_LOG_AUTO_MESSAGE_SUFFIX,
      )
      handleSendMessage(pendingAutoMessage)
      setPendingAutoMessage(null)
    }
  }, [pendingAutoMessage, currentLoopId, isSending, handleSendMessage])

  return {
    isTourActive,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    loopMetadata,
    analysis,
    currentLoopId,
    gameContext,
    suggestions,
    selectedNode,
    isMarketAnalysisOpen,
    marketAnalysisKey,
    showCreateLoopDialog,
    userEmail,
    saveStatus,
    groundingScore,
    isActivityPanelOpen,
    messages,
    isSending,
    thinkingAgent,
    streamingTokens,
    isTokenStreaming,
    activeAgents,
    streamingSections,
    mentionProviders,
    projectContextForMentions,
    tourIds: TOUR_STEP_IDS,
    setShowCreateLoopDialog,
    setIsMarketAnalysisOpen,
    setIsActivityPanelOpen,
    setRfInstance,
    handleLoopChange,
    handleReset,
    handleCreateLoopFromSelector,
    handleCreateLoopFromEmptyState,
    handleLoopCreatedWithConcept,
    handleAcceptSuggestion,
    handleRejectSuggestion,
    handleClearAllSuggestions,
    handleAcceptAllSuggestions,
    handleNodeClick,
    handlePaneClick,
    handleNodeUpdate,
    handleNodeDelete,
    createNode,
    onImportJson,
    onConnect,
    handleTidyUp,
    handleSendMessage,
    stopStream,
  }
}
