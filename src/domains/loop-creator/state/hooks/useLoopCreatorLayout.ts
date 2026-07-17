'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
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
import {
  nodeDescription,
  nodeLabel,
} from '@/domains/loop-creator/core/loop-node-wire'
import {
  parseLoopStreamStateCounts,
  parseLoopStreamThreadId,
} from '@/domains/loop-creator/core/loop-agent-action-wire'
import { NEXT_AGENT_SUPERVISOR } from '@/domains/loop-creator/constants/graph-state-defaults'
import { useTour } from '@/components/shell/Tour'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { useAutoSave } from '@/domains/loop-creator/state/useAutoSave'
import { Suggestion } from '@/domains/loop-creator/ui/components/SuggestionPanel'
import { createLoop, type PersistedGameLoop } from '../../core/io/loops.api'
import {
  LoopCanvasKind,
  LoopChatMessageType,
  LoopCreatorAgentKey,
  LoopLlmRole,
  LOOP_LOG_ACTION_RECEIVED,
  LOOP_LOG_AUTO_MESSAGE_SUFFIX,
  LOOP_LOG_AUTO_START,
  LOOP_LOG_CANVAS_RESET,
  LOOP_LOG_CREATE_FAILED,
  LOOP_LOG_LOOP_CREATED,
  LOOP_LOG_MARKET_ANALYSIS_OPEN,
  LOOP_LOG_SEND_AUTO_MESSAGE,
  LOOP_LOG_SWITCHED_LOOP,
  LOOP_LOG_UNKNOWN_ACTION,
  LOOP_CREATOR_WELCOME_MESSAGE,
} from '@/domains/loop-creator/ui/constants/loop-creator-layout'
import {
  EMPTY_LOOP_GAME_CONTEXT,
  type LoopGameContext,
} from '@/domains/loop-creator/ui/types/loop-layout-wires'
import { mapLoopAgentActionToEffects } from '@/domains/loop-creator/ui/utils/loop-agent-action-handler'
import {
  persistedEdgesFromUnknown,
  persistedNodesFromUnknown,
} from '@/domains/loop-creator/ui/utils/persisted-graph'
import { useLoopCreatorGraphHandlers } from '@/domains/loop-creator/state/hooks/useLoopCreatorGraphHandlers'

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

  const createNewLoop = useCallback(
    async (
      name: string,
      importedNodes?: Node[],
      importedEdges?: Edge[],
      importedMetadata?: unknown,
      importedAnalysis?: unknown,
    ) => {
      try {
        const newLoop = await createLoop({
          projectId,
          name,
          nodes: importedNodes || nodes,
          edges: importedEdges || edges,
          metadata: importedMetadata || loopMetadata,
          analysis: importedAnalysis || analysis,
        })
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

  const {
    handleTidyUp,
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
  } = useLoopCreatorGraphHandlers({
    nodes,
    edges,
    suggestions,
    rfInstance,
    setNodes,
    setEdges,
    setSuggestions,
    setSelectedNode,
    setLoopMetadata,
    setAnalysis,
    setGameContext,
    createNewLoop,
  })

  const mentionProviders = useMemo(
    () => [...getLoopCreatorMentionProviders(), getGameEntityProvider()],
    [],
  )

  const projectContextForMentions = useMemo(
    () => {
      const partitionedNodes = nodes.reduce<{
        mechanics: Array<{ id: string; name: string; type?: string; description: string }>
        loops: Array<{ id: string; name: string; type: typeof LoopCanvasKind.Loop; description: string }>
      }>(
        (accumulator, node) => {
          const description = nodeDescription(node)
          const labeledNode = {
            id: node.id,
            name: nodeLabel(node),
            description,
          }

          if (node.type === LoopCanvasKind.Loop) {
            accumulator.loops.push({
              ...labeledNode,
              type: LoopCanvasKind.Loop,
            })
          } else {
            accumulator.mechanics.push({
              ...labeledNode,
              ...(node.type ? { type: node.type } : {}),
            })
          }

          return accumulator
        },
        { mechanics: [], loops: [] },
      )

      return buildLoopCreatorProjectContext({
        projectId,
        mechanics: partitionedNodes.mechanics,
        loops: partitionedNodes.loops,
        connections: edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
        })),
        balanceAnalysis: analysis,
        gameGenre: gameContext.gameGenre,
        gamePlatform: gameContext.gamePlatform,
        targetAudience: gameContext.targetAudience,
      })
    },
    [projectId, nodes, edges, analysis, gameContext],
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
        content: LOOP_CREATOR_WELCOME_MESSAGE,
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
