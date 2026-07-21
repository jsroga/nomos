'use client'

import { Edge, Node } from '@xyflow/react'
import { type PersistedGameLoop } from '@/domains/loop-creator/core/io/loops.api'
import { useLoopCreatorGraphHandlers } from '@/domains/loop-creator/state/hooks/useLoopCreatorGraphHandlers'
import type { LoopCreatorCore } from './useLoopCreatorCore'

interface UseLoopCreatorGraphParams {
  core: LoopCreatorCore
  createNewLoop: (
    name: string,
    importedNodes?: Node[],
    importedEdges?: Edge[],
    importedMetadata?: unknown,
    importedAnalysis?: unknown,
  ) => Promise<PersistedGameLoop | null>
}

export function useLoopCreatorGraph({ core, createNewLoop }: UseLoopCreatorGraphParams) {
  const {
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
  } = core

  return useLoopCreatorGraphHandlers({
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
}
