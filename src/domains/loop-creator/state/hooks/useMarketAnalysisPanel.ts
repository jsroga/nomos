'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Node, Edge } from '@xyflow/react'
import { MarketAnalysisReport } from '../../ai/agents/market-analyst/types'
import { LoopAbortErrorName } from '@/domains/loop-creator/constants/abort-error'
import { CANVAS_NODE_TYPE_GROUP } from '@/domains/loop-creator/constants/graph-state-defaults'
import { LoopHttpMethod } from '@/domains/loop-creator/constants/loop-http'
import { joinUrlPath } from '@/shared/data/url-builder'
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
  const mechanics = nodes
    .filter(node => node.type !== CANVAS_NODE_TYPE_GROUP)
    .map(node => ({
      id: node.id,
      name: nodeLabel(node, LOOP_NODE_LABEL_UNNAMED),
      type: nodeTypeField(node, LOOP_NODE_TYPE_DEFAULT),
      description: nodeDescription(node),
    }))

  const connections = edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edgeLabel(edge),
  }))

  const loops = nodes
    .filter(node => node.type === CANVAS_NODE_TYPE_GROUP)
    .map(node => ({
      id: node.id,
      name: nodeLabel(node, LOOP_GROUP_LABEL_UNNAMED),
      type: groupTimescale(node),
      description: nodeDescription(node),
    }))

  return {
    mechanics,
    connections,
    loops,
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
      const response = await fetch(joinUrlPath('/api/loop-creator/market-analysis', gameLoopId))
      const data = await response.json()

      if (response.ok && data.exists && data.analysis) {
        setReport(data.analysis)
        setSavedAt(new Date(data.metadata.createdAt))
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

      const response = await fetch('/api/loop-creator/market-analysis', {
        method: LoopHttpMethod.Post,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildMarketAnalysisPayload(nodes, edges, gameContext)),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`)
      }

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
      const response = await fetch(joinUrlPath('/api/loop-creator/market-analysis', gameLoopId), {
        method: LoopHttpMethod.Post,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || MarketAnalysisErrorMessage.FailedToSave)
      }

      setSavedAt(new Date(data.createdAt))
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
        await fetch(joinUrlPath('/api/loop-creator/market-analysis', gameLoopId), {
          method: LoopHttpMethod.Delete,
        })
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
