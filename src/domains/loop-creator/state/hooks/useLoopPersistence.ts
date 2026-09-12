'use client'

import { useCallback } from 'react'
import { Edge, Node } from '@xyflow/react'
import { useQueryClient } from '@tanstack/react-query'
import { useAutoSave } from '@/domains/loop-creator/state/useAutoSave'
import { createLoop, type PersistedGameLoop } from '@/domains/loop-creator/core/io/loops.api'
import { isWorkspaceChatOverlayEnabled } from '@/shared/data/feature-flags'
import { startLoopCreatorGenerationChat } from '@/domains/loop-creator/state/utils/start-loop-creator-generation-chat'
import {
  LOOP_LOG_AUTO_START,
  LOOP_LOG_CANVAS_RESET,
  LOOP_LOG_CREATE_FAILED,
  LOOP_LOG_LOOP_CREATED,
  LOOP_LOG_SWITCHED_LOOP,
} from '@/domains/loop-creator/ui/utils/loop-creator-layout'
import { type LoopGameContext } from '@/domains/loop-creator/ui/types/loop-layout-wires'
import {
  persistedEdgesFromUnknown,
  persistedNodesFromUnknown,
} from '@/domains/loop-creator/ui/utils/persisted-graph'
import type { LoopCreatorCore } from './useLoopCreatorCore'

export function useLoopPersistence(projectId: string, core: LoopCreatorCore) {
  const {
    nodes,
    edges,
    loopMetadata,
    analysis,
    currentLoopId,
    setNodes,
    setEdges,
    setLoopMetadata,
    setAnalysis,
    setCurrentLoopId,
    setSuggestions,
    setSelectedNode,
    setGameContext,
    setShowCreateLoopDialog,
    setPendingAutoPrompt,
  } = core

  useAutoSave({
    loopId: currentLoopId,
    nodes,
    edges,
    metadata: loopMetadata,
    analysis,
    enabled: !!currentLoopId,
  })

  const queryClient = useQueryClient()

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
    [projectId, nodes, edges, loopMetadata, analysis, setCurrentLoopId],
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
    [setNodes, setEdges, setLoopMetadata, setAnalysis, setCurrentLoopId, setSuggestions, setSelectedNode],
  )

  const handleReset = useCallback(() => {
    setNodes([])
    setEdges([])
    setLoopMetadata(null)
    setAnalysis(null)
    setSuggestions([])
    setSelectedNode(null)
    console.log(LOOP_LOG_CANVAS_RESET)
  }, [setNodes, setEdges, setLoopMetadata, setAnalysis, setSuggestions, setSelectedNode])

  const handleCreateLoopFromSelector = useCallback(
    async (name: string, gameConcept?: string) => {
      if (gameConcept) {
        setGameContext((prev: LoopGameContext) => ({ ...prev, gameDescription: gameConcept }))
      }
      return createNewLoop(name, [], [])
    },
    [createNewLoop, setGameContext],
  )

  const handleCreateLoopFromEmptyState = useCallback(() => {
    setShowCreateLoopDialog(true)
  }, [setShowCreateLoopDialog])

  const handleLoopCreatedWithConcept = useCallback(
    (_loop: PersistedGameLoop, gameConcept: string) => {
      console.log(LOOP_LOG_AUTO_START, gameConcept)
      setGameContext((prev: LoopGameContext) => ({ ...prev, gameDescription: gameConcept }))
      void startLoopCreatorGenerationChat({
        projectId,
        gameConcept,
        queryClient,
        overlayEnabled: isWorkspaceChatOverlayEnabled(),
        setPendingAutoPrompt,
      })
    },
    [projectId, queryClient, setGameContext, setPendingAutoPrompt],
  )

  return {
    createNewLoop,
    handleLoopChange,
    handleReset,
    handleCreateLoopFromSelector,
    handleCreateLoopFromEmptyState,
    handleLoopCreatedWithConcept,
  }
}
