'use client'

import React, { useCallback } from 'react'
import {
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
} from '@xyflow/react'
import { autoLayoutNodes } from '@/domains/loop-creator/core/layout'
import {
  readChangeNodeType,
  fileReaderText,
} from '@/domains/loop-creator/core/loop-node-wire'
import { LoopNodeType } from '@/domains/loop-creator/constants/custom-nodes'
import { CANVAS_NODE_TYPE_GROUP } from '@/domains/loop-creator/constants/graph-state-defaults'
import { Suggestion } from '@/domains/loop-creator/ui/components/SuggestionPanel'
import { type PersistedGameLoop } from '@/domains/loop-creator/core/io/loops.api'
import {
  LoopSuggestionKind,
  LOOP_CONNECTION_STROKE,
  LOOP_GENRE_JOIN,
  LOOP_IMPORT_EDGE_LABEL_BG,
  LOOP_IMPORT_EDGE_LABEL_FILL,
  LOOP_JSON_EXTENSION,
  LOOP_JSON_PARSE_ALERT,
  LOOP_LOG_ACCEPT_SUGGESTION,
  LOOP_LOG_APPLIED_ALL,
  LOOP_LOG_APPLY_ALL,
  LOOP_LOG_CLEAR_CANVAS,
  LOOP_LOG_JSON_PARSE_ERROR,
  LOOP_LOG_REJECT_SUGGESTION,
} from '@/domains/loop-creator/ui/constants/loop-creator-layout'
import { type LoopGameContext } from '@/domains/loop-creator/ui/types/loop-layout-wires'
import { createCanvasNode } from '@/domains/loop-creator/ui/utils/create-canvas-node'
import {
  gameContextPatchFromImport,
  parseLoopImportFile,
} from '@/domains/loop-creator/ui/utils/loop-import-json'
import {
  applyAllSuggestionsToGraph,
  applySuggestionToGraph,
} from '@/domains/loop-creator/ui/utils/suggestion-graph'

interface UseLoopCreatorGraphHandlersParams {
  nodes: Node[]
  edges: Edge[]
  suggestions: Suggestion[]
  rfInstance: ReactFlowInstance | null
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
  setSuggestions: React.Dispatch<React.SetStateAction<Suggestion[]>>
  setSelectedNode: React.Dispatch<React.SetStateAction<Node | null>>
  setLoopMetadata: React.Dispatch<React.SetStateAction<unknown | null>>
  setAnalysis: React.Dispatch<React.SetStateAction<unknown | null>>
  setGameContext: React.Dispatch<React.SetStateAction<LoopGameContext>>
  createNewLoop: (
    name: string,
    importedNodes?: Node[],
    importedEdges?: Edge[],
    importedMetadata?: unknown,
    importedAnalysis?: unknown,
  ) => Promise<PersistedGameLoop | null>
}

export function useLoopCreatorGraphHandlers({
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
}: UseLoopCreatorGraphHandlersParams) {
  const handleTidyUp = useCallback(() => {
    setNodes(nds => autoLayoutNodes(nds, edges))
    setTimeout(() => {
      rfInstance?.fitView({ padding: 0.1, duration: 800 })
    }, 100)
  }, [edges, setNodes, rfInstance])

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
    [nodes, edges, setNodes, setEdges, setLoopMetadata, setAnalysis, setSuggestions],
  )

  const handleRejectSuggestion = useCallback(
    (suggestion: Suggestion) => {
      console.log(LOOP_LOG_REJECT_SUGGESTION, suggestion.id)
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))
    },
    [setSuggestions],
  )

  const handleClearAllSuggestions = useCallback(() => {
    setSuggestions([])
  }, [setSuggestions])

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
  }, [suggestions, nodes, edges, setNodes, setEdges, rfInstance, setLoopMetadata, setAnalysis, setSuggestions])

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [setSelectedNode])

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [setSelectedNode])

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
    [setNodes, setSelectedNode],
  )

  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      setNodes(nds => nds.filter(n => n.id !== nodeId))
      setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId))
      setSelectedNode(null)
    },
    [setNodes, setEdges, setSelectedNode],
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
    [setNodes, setEdges, rfInstance, createNewLoop, setLoopMetadata, setAnalysis, setGameContext],
  )

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges(eds =>
        addEdge({ ...params, animated: true, style: { stroke: LOOP_CONNECTION_STROKE } }, eds),
      ),
    [setEdges],
  )

  return {
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
  }
}
