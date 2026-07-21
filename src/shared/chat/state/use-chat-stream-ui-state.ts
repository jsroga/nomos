import { useState, useCallback } from 'react'
import type { ProgressSection } from '../ui/SectionProgress'
import type { AgentStatusInfo } from '../ui/AgentLog'
import type { Citation } from '../ui/CitationDisplay'

export function useChatStreamUiState() {
  const [thinkingAgent, setThinkingAgent] = useState<string | null>(null)
  const [streamingSections, setStreamingSections] = useState<ProgressSection[]>([])
  const [isTokenStreaming, setIsTokenStreaming] = useState(false)
  const [isAwaitingInput, setIsAwaitingInput] = useState(false)
  const [activeAgents, setActiveAgents] = useState<AgentStatusInfo[]>([])
  const [citations, setCitations] = useState<Citation[]>([])
  const [groundingScore, setGroundingScore] = useState<number | null>(null)
  const [roundCount, setRoundCount] = useState(0)
  const [loadingSections, setLoadingSections] = useState<
    Record<string, { loading: boolean; message?: string }>
  >({})

  const clearCitations = useCallback(() => {
    setCitations([])
    setGroundingScore(null)
  }, [])

  return {
    thinkingAgent,
    setThinkingAgent,
    streamingSections,
    setStreamingSections,
    isTokenStreaming,
    setIsTokenStreaming,
    isAwaitingInput,
    setIsAwaitingInput,
    activeAgents,
    setActiveAgents,
    citations,
    setCitations,
    groundingScore,
    setGroundingScore,
    roundCount,
    setRoundCount,
    loadingSections,
    setLoadingSections,
    clearCitations,
  }
}
