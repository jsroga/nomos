import { useState, useRef, useCallback, useEffect } from 'react'
import type { ProgressSection } from '../ui/SectionProgress'
import type { AgentStatusInfo } from '../ui/AgentLog'

const TOKEN_FLUSH_INTERVAL_MS = 120

interface UseChatStreamTokenBufferOptions {
  verboseUiEnabled: boolean
  setStreamingSections: React.Dispatch<React.SetStateAction<ProgressSection[]>>
  setActiveAgents: React.Dispatch<React.SetStateAction<AgentStatusInfo[]>>
}

export function useChatStreamTokenBuffer({
  verboseUiEnabled,
  setStreamingSections,
  setActiveAgents,
}: UseChatStreamTokenBufferOptions) {
  const verboseUiRef = useRef(verboseUiEnabled)

  useEffect(() => {
    verboseUiRef.current = verboseUiEnabled
  }, [verboseUiEnabled])

  const [streamingTokens, setStreamingTokens] = useState<string>('')
  const streamingTokensRef = useRef<string>('')
  const tokenFlushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTokenFlushAtRef = useRef(0)

  const flushStreamingTokens = useCallback(() => {
    lastTokenFlushAtRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now()
    setStreamingTokens(streamingTokensRef.current)
    if (tokenFlushTimeoutRef.current) {
      clearTimeout(tokenFlushTimeoutRef.current)
      tokenFlushTimeoutRef.current = null
    }
  }, [])

  const scheduleTokenFlush = useCallback(() => {
    if (!verboseUiRef.current) return

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const elapsed = now - lastTokenFlushAtRef.current
    if (elapsed >= TOKEN_FLUSH_INTERVAL_MS) {
      flushStreamingTokens()
      return
    }

    if (tokenFlushTimeoutRef.current !== null) return
    const wait = Math.max(0, TOKEN_FLUSH_INTERVAL_MS - elapsed)
    tokenFlushTimeoutRef.current = setTimeout(flushStreamingTokens, wait)
  }, [flushStreamingTokens])

  const cancelTokenFlush = useCallback(() => {
    if (tokenFlushTimeoutRef.current) {
      clearTimeout(tokenFlushTimeoutRef.current)
      tokenFlushTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    return cancelTokenFlush
  }, [cancelTokenFlush])

  useEffect(() => {
    if (verboseUiEnabled) {
      if (streamingTokensRef.current) {
        setStreamingTokens(streamingTokensRef.current)
      }
      return
    }
    cancelTokenFlush()
    setStreamingTokens('')
    setStreamingSections([])
    setActiveAgents([])
  }, [cancelTokenFlush, setActiveAgents, setStreamingSections, verboseUiEnabled])

  return {
    verboseUiRef,
    streamingTokens,
    setStreamingTokens,
    streamingTokensRef,
    scheduleTokenFlush,
    cancelTokenFlush,
  }
}
