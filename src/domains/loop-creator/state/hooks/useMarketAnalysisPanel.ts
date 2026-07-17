'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Node, Edge } from '@xyflow/react'
import { MarketAnalysisReport } from '../../ai/agents/market-analyst/types'
import { LoopAbortErrorName } from '@/domains/loop-creator/constants/abort-error'
import { CANVAS_NODE_TYPE_GROUP } from '@/domains/loop-creator/constants/graph-state-defaults'
import {
  LOOP_GROUP_LABEL_UNNAMED,
  LOOP_NODE_LABEL_UNNAMED,
  LOOP_NODE_TYPE_DEFAULT,
} from '@/domains/loop-creator/constants/loop-node-defaults'
import {
  LoopGameAudienceDefault,
  LoopGameGenreDefault,
  LoopGamePlatformDefault,
  MARKET_ANALYSIS_SSE_DATA_PREFIX,
  MarketAnalysisErrorMessage,
  MarketAnalysisStreamEvent,
} from '@/domains/loop-creator/constants/market-analysis'
import {
  edgeLabel,
  groupTimescale,
  nodeDescription,
  nodeLabel,
  nodeTypeField,
} from '@/domains/loop-creator/core/loop-node-wire'
import {
  deleteSavedMarketAnalysis,
  fetchSavedMarketAnalysis,
  saveMarketAnalysis,
  startMarketAnalysis,
} from '../../core/io/market-analysis.api'

interface UseMarketAnalysisPanelParams {
  isOpen: boolean
  nodes: Node[]
  edges: Edge[]
  gameLoopId: string | null
  gameContext: {
    gameGenre: string
    gamePlatform: string
    targetAudience: string
    gameDescription: string
  }
}

interface ProgressMessage {
  type: MarketAnalysisStreamEvent
  content: string
  timestamp: number
}

function buildMarketAnalysisPayload(
  nodes: Node[],
  edges: Edge[],
  gameContext: UseMarketAnalysisPanelParams['gameContext'],
) {
  const partitionedNodes = nodes.reduce<{
    mechanics: Array<{ id: string; name: string; type: string; description: string }>
    loops: Array<{ id: string; name: string; type: string; description: string }>
  }>(
    (accumulator, node) => {
      const labeledNode = {
        id: node.id,
        name: nodeLabel(
          node,
          node.type === CANVAS_NODE_TYPE_GROUP ? LOOP_GROUP_LABEL_UNNAMED : LOOP_NODE_LABEL_UNNAMED
        ),
        description: nodeDescription(node),
      }

      if (node.type === CANVAS_NODE_TYPE_GROUP) {
        accumulator.loops.push({
          ...labeledNode,
          type: groupTimescale(node),
        })
      } else {
        accumulator.mechanics.push({
          ...labeledNode,
          type: nodeTypeField(node, LOOP_NODE_TYPE_DEFAULT),
        })
      }

      return accumulator
    },
    { mechanics: [], loops: [] },
  )

  return {
    mechanics: partitionedNodes.mechanics,
    connections: edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edgeLabel(edge),
    })),
    loops: partitionedNodes.loops,
    gameGenre: gameContext.gameGenre || LoopGameGenreDefault.Indie,
    gamePlatform: gameContext.gamePlatform || LoopGamePlatformDefault.Pc,
    targetAudience: gameContext.targetAudience || LoopGameAudienceDefault.Core,
    gameDescription: gameContext.gameDescription || '',
  }
}

async function consumeMarketAnalysisStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  handlers: {
    onReport: (report: MarketAnalysisReport) => void
    onError: (message: string) => void
    onProgress: (message: ProgressMessage) => void
  },
) {
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith(MARKET_ANALYSIS_SSE_DATA_PREFIX)) continue

      try {
        const data = JSON.parse(line.slice(MARKET_ANALYSIS_SSE_DATA_PREFIX.length))

        if (data.type === MarketAnalysisStreamEvent.Report && data.content) {
          handlers.onReport(data.content)
        } else if (data.type === MarketAnalysisStreamEvent.Error) {
          handlers.onError(
            typeof data.content === 'string'
              ? data.content
              : MarketAnalysisErrorMessage.AnalysisError,
          )
        } else {
          handlers.onProgress({
            type: data.type,
            content:
              typeof data.content === 'string' ? data.content : JSON.stringify(data.content),
            timestamp: Date.now(),
          })
        }
      } catch {
        // Ignore parse errors
      }
    }
  }
}

export function useMarketAnalysisPanel({
  isOpen,
  nodes,
  edges,
  gameLoopId,
  gameContext,
}: UseMarketAnalysisPanelParams) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [report, setReport] = useState<MarketAnalysisReport | null>(null)
  const [progressMessages, setProgressMessages] = useState<ProgressMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const loadSavedAnalysis = useCallback(async () => {
    if (!gameLoopId) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchSavedMarketAnalysis(gameLoopId)
      if (data.exists && data.analysis) {
        setReport(data.analysis)
        const createdAt = data.metadata?.createdAt
        if (typeof createdAt === 'string' || createdAt instanceof Date) {
          setSavedAt(new Date(createdAt))
        }
        setHasUnsavedChanges(false)
      }
    } catch {
      // No saved analysis is fine
    } finally {
      setIsLoading(false)
    }
  }, [gameLoopId])

  useEffect(() => {
    if (isOpen && gameLoopId) {
      void loadSavedAnalysis()
    }
  }, [isOpen, gameLoopId, loadSavedAnalysis])

  useEffect(() => {
    if (!isOpen) {
      setError(null)
      setProgressMessages([])
    }
  }, [isOpen])

  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true)
    setError(null)
    setProgressMessages([])
    setReport(null)
    setHasUnsavedChanges(false)

    try {
      abortControllerRef.current = new AbortController()

      const response = await startMarketAnalysis(
        buildMarketAnalysisPayload(nodes, edges, gameContext),
        abortControllerRef.current.signal
      )

      const reader = response.body?.getReader()
      if (!reader) throw new Error(MarketAnalysisErrorMessage.NoResponseBody)

      await consumeMarketAnalysisStream(reader, {
        onReport: nextReport => {
          setReport(nextReport)
          setHasUnsavedChanges(true)
        },
        onError: message => setError(message),
        onProgress: message => setProgressMessages(previous => [...previous, message]),
      })
    } catch (err) {
      if (err instanceof Error && err.name !== LoopAbortErrorName.AbortError) {
        setError(err.message)
      }
    } finally {
      setIsAnalyzing(false)
      abortControllerRef.current = null
    }
  }, [nodes, edges, gameContext])

  const saveAnalysis = useCallback(async () => {
    if (!gameLoopId || !report) return

    setIsSaving(true)
    setError(null)

    try {
      const data = await saveMarketAnalysis(gameLoopId, report)
      const createdAt = data.createdAt
      if (typeof createdAt !== 'string' && !(createdAt instanceof Date)) {
        throw new Error(MarketAnalysisErrorMessage.FailedToSave)
      }
      setSavedAt(new Date(createdAt))
      setHasUnsavedChanges(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : MarketAnalysisErrorMessage.FailedToSave)
    } finally {
      setIsSaving(false)
    }
  }, [gameLoopId, report])

  const regenerateAnalysis = useCallback(async () => {
    if (gameLoopId) {
      try {
        await deleteSavedMarketAnalysis(gameLoopId)
      } catch {
        // Ignore delete errors
      }
    }

    setSavedAt(null)
    await runAnalysis()
  }, [gameLoopId, runAnalysis])

  const cancelAnalysis = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsAnalyzing(false)
  }, [])

  return {
    isAnalyzing,
    isLoading,
    isSaving,
    report,
    progressMessages,
    error,
    savedAt,
    hasUnsavedChanges,
    runAnalysis,
    saveAnalysis,
    regenerateAnalysis,
    cancelAnalysis,
  }
}
