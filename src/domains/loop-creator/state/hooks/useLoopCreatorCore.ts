'use client'

import { useEffect, useState } from 'react'
import {
  Edge,
  Node,
  ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import { Suggestion } from '@/domains/loop-creator/ui/components/SuggestionPanel'
import {
  EMPTY_LOOP_GAME_CONTEXT,
  type LoopGameContext,
} from '@/domains/loop-creator/ui/types/loop-layout-wires'

export function useLoopCreatorCore() {
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

  return {
    nodes,
    setNodes,
    onNodesChange,
    edges,
    setEdges,
    onEdgesChange,
    threadId,
    setThreadId,
    rfInstance,
    setRfInstance,
    loopMetadata,
    setLoopMetadata,
    analysis,
    setAnalysis,
    isActivityPanelOpen,
    setIsActivityPanelOpen,
    currentLoopId,
    setCurrentLoopId,
    gameContext,
    setGameContext,
    suggestions,
    setSuggestions,
    selectedNode,
    setSelectedNode,
    isMarketAnalysisOpen,
    setIsMarketAnalysisOpen,
    marketAnalysisKey,
    setMarketAnalysisKey,
    showCreateLoopDialog,
    setShowCreateLoopDialog,
    userEmail,
    pendingAutoMessage,
    setPendingAutoMessage,
  }
}

export type LoopCreatorCore = ReturnType<typeof useLoopCreatorCore>
