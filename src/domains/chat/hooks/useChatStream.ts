/**
 * useChatStream Hook
 *
 * Enhanced chat streaming hook with support for:
 * - Token streaming
 * - Section progress tracking
 * - Agent status updates
 * - Citation events
 * - Grounding scores
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { Message, AgentAction, AgentQuestion, QuestionSession, ActionStatus, ActivityLogEntry } from '../types'
import { AgentStatusInfo, AgentStatus } from '../components/AgentLog'
import { Citation } from '../components/CitationDisplay'
import { ProgressSection } from '../components/SectionProgress'
import {
  saveChatState,
  loadChatState,
  saveInterruptedStream,
  loadInterruptedStream,
  clearInterruptedStream,
} from '@/lib/chat-persistence'
import { generateSessionId } from '@/lib/langfuse-session'

interface UseChatStreamProps {
  initialMessages?: Message[]
  onAction?: (action: AgentAction) => Promise<void>
  onQuestion?: (question: QuestionSession) => void
  onStreamingUpdate?: (data: any) => void
  onCitationsUpdate?: (citations: Citation[]) => void
  onGroundingUpdate?: (score: number, details: any) => void
  /** Called when a specific bible section starts/stops loading */
  onSectionLoading?: (section: string, loading: boolean, message?: string) => void
  /** Called when streaming completes (success or error) */
  onComplete?: () => void
  /** Optional key for sessionStorage persistence (e.g., project/episode ID) */
  persistKey?: string
  /** Langfuse session ID for grouping traces. If not provided, one will be generated */
  sessionId?: string
  /** Project ID for session context */
  projectId?: string
  /** Episode ID for session context */
  episodeId?: string
  /** User ID for session context */
  userId?: string
}

export interface StreamState {
  // Core state
  messages: Message[]
  isSending: boolean
  thinkingAgent: string | null

  // Streaming state
  streamingTokens: string
  isTokenStreaming: boolean
  isAwaitingInput: boolean

  // Progress tracking
  streamingSections: ProgressSection[]

  // Agent status
  activeAgents: AgentStatusInfo[]

  // Citations
  citations: Citation[]
  groundingScore: number | null

  // Round tracking
  roundCount: number

  // Section-specific loading states (for bible sections like soundtracks, factions, etc.)
  loadingSections: Record<string, { loading: boolean; message?: string }>
}

export function useChatStream({
  initialMessages = [],
  onAction,
  onQuestion,
  onStreamingUpdate,
  onCitationsUpdate,
  onGroundingUpdate,
  onSectionLoading,
  onComplete,
  persistKey,
  sessionId: propSessionId,
  projectId,
  episodeId,
  userId,
}: UseChatStreamProps = {}) {
  // Generate or use provided session ID for Langfuse tracing
  const sessionId = propSessionId || generateSessionId(projectId, episodeId, userId)
  // Get initial messages from sessionStorage if persistKey is provided
  const getInitialMessages = (): Message[] => {
    if (persistKey && typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(`chat-messages-${persistKey}`)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log(`📦 [useChatStream] Restored ${parsed.length} messages from sessionStorage`)
            return parsed
          }
        }
      } catch (e) {
        console.error('[useChatStream] Failed to restore messages:', e)
      }
    }
    return initialMessages
  }

  const [messages, setMessagesInternal] = useState<Message[]>(getInitialMessages)
  const [wasStreamingOnLoad, setWasStreamingOnLoad] = useState(false)

  // DEBUG: Wrap setMessages to track all changes
  const setMessages = useCallback((updater: Message[] | ((prev: Message[]) => Message[])) => {
    setMessagesInternal(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      console.log(`📝 [useChatStream] setMessages: ${prev.length} -> ${next.length} messages`)
      if (next.length < prev.length && prev.length > 1) {
        console.warn('⚠️ [useChatStream] Message count DECREASED!')
        console.trace('Stack trace')
      }
      return next
    })
  }, [])
  const [isSending, setIsSending] = useState(false)
  const [thinkingAgent, setThinkingAgent] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Streaming state
  const [streamingTokens, setStreamingTokens] = useState<string>('')
  const streamingTokensRef = useRef<string>('')
  const [streamingSections, setStreamingSections] = useState<ProgressSection[]>([])
  const [isTokenStreaming, setIsTokenStreaming] = useState(false)
  const [isAwaitingInput, setIsAwaitingInput] = useState(false)

  // Agent status tracking
  const [activeAgents, setActiveAgents] = useState<AgentStatusInfo[]>([])

  // Citation tracking
  const [citations, setCitations] = useState<Citation[]>([])
  const [groundingScore, setGroundingScore] = useState<number | null>(null)

  // Track round count
  const [roundCount, setRoundCount] = useState(0)

  // Section-specific loading states (for bible sections)
  const [loadingSections, setLoadingSections] = useState<Record<string, { loading: boolean; message?: string }>>({})

  // Restore streaming state on mount or when key changes
  useEffect(() => {
    if (persistKey && typeof window !== 'undefined') {
      // 1. Restore Messages
      try {
        const storedMessages = sessionStorage.getItem(`chat-messages-${persistKey}`)
        if (storedMessages) {
          const parsed = JSON.parse(storedMessages)
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log(`📦 [useChatStream] Restored ${parsed.length} messages for key: ${persistKey}`)
            setMessagesInternal(parsed)
          }
        }
      } catch (e) {
        console.error('[useChatStream] Failed to restore messages:', e)
      }

      // 2. Restore Streaming State (existing logic)
      const savedState = loadChatState(persistKey)
      if (savedState) {
        console.log('[useChatStream] Restored streaming state from storage')

        if (savedState.isSending) {
          setWasStreamingOnLoad(true)
          console.log('[useChatStream] Stream was interrupted by page reload')

          const interrupted = loadInterruptedStream(persistKey)
          if (!interrupted) {
            saveInterruptedStream(persistKey, {
              streamId: `stream-${Date.now()}`,
              threadId: persistKey,
              timestamp: Date.now(),
              agent: savedState.thinkingAgent || 'Unknown',
              task: 'In progress',
            })
          }
        }
      }
    }
  }, [persistKey])

  // Persist full chat state to sessionStorage whenever it changes
  useEffect(() => {
    if (persistKey && typeof window !== 'undefined') {
      try {
        saveChatState(persistKey, {
          messages,
          isSending,
          thinkingAgent,
          streamingTokens,
        })
      } catch (e) {
        console.error('[useChatStream] Failed to persist state:', e)
      }
    }
  }, [messages, isSending, thinkingAgent, streamingTokens, persistKey])

  // Save interrupted stream state on page unload
  useEffect(() => {
    if (!persistKey || typeof window === 'undefined') return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSending && thinkingAgent) {
        // Warn user
        e.preventDefault()
        e.returnValue = 'Agent is still working. Leave anyway?'

        // Save interrupted state
        saveInterruptedStream(persistKey, {
          streamId: `stream-${Date.now()}`,
          threadId: persistKey,
          timestamp: Date.now(),
          agent: thinkingAgent,
          task: 'Processing request...',
        })
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isSending, thinkingAgent, persistKey])

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsSending(false)
    setThinkingAgent(null)
    setIsTokenStreaming(false)
    setStreamingTokens('')
    setStreamingSections([])
    setIsAwaitingInput(false)
    setActiveAgents([])

    setMessages(prev => [
      ...prev,
      {
        sender: 'System',
        content: '⏹️ Stream stopped by user.',
        type: 'ai',
      },
    ])
  }, [])

  /**
   * Update agent status
   */
  // Helper to append activity log entries to the current/last AI message
  const appendActivityLog = useCallback((entry: ActivityLogEntry) => {
    setMessages(prev => {
      // Find the last AI message (even if it's not the absolute last item, though it should be)
      const lastAiMsgIndex = [...prev].reverse().findIndex(m => m && m.type === 'ai')
      const actualIndex = lastAiMsgIndex === -1 ? -1 : prev.length - 1 - lastAiMsgIndex

      if (actualIndex !== -1) {
        const updatedMessages = [...prev]
        const lastMsg = updatedMessages[actualIndex]
        const currentLog = lastMsg.activityLog || []
        updatedMessages[actualIndex] = {
          ...lastMsg,
          activityLog: [...currentLog, entry]
        }
        return updatedMessages
      }

      // Fallback: This shouldn't happen with the 'start' event fix, but for safety:
      return [
        ...prev,
        {
          sender: 'Storyteller',
          content: '',
          type: 'ai',
          activityLog: [entry]
        }
      ]
    })
  }, [])

  const updateAgentStatus = useCallback(
    (agent: string, status: AgentStatus, message?: string, details?: string) => {
      setActiveAgents(prev => {
        const existing = prev.find(a => a.agent === agent)

        // Remove if complete or error
        if (status === 'complete' || status === 'error' || status === 'idle') {
          return prev.filter(a => a.agent !== agent)
        }

        if (existing) {
          return prev.map(a => (a.agent === agent ? { ...a, status, message, details } : a))
        }

        return [
          ...prev,
          {
            agent,
            status,
            message,
            details,
            startTime: Date.now(),
          },
        ]
      })
    },
    []
  )

  /**
   * Update action status within a message
   * Used for the approve/reject flow
   */
  const updateActionStatus = useCallback(
    (messageIndex: number, actionIndex: number, newStatus: ActionStatus) => {
      console.log(
        `🔄 [updateActionStatus] Setting msg[${messageIndex}].actions[${actionIndex}].status = ${newStatus}`
      )
      setMessagesInternal(prev => {
        const newMessages = prev.map((msg, mIdx) => {
          if (mIdx !== messageIndex || !msg.actions) return msg
          return {
            ...msg,
            actions: msg.actions.map((action, aIdx) =>
              aIdx === actionIndex ? { ...action, status: newStatus } : action
            ),
          }
        })
        console.log(
          '🔄 [updateActionStatus] Updated messages, action status now:',
          newMessages[messageIndex]?.actions?.[actionIndex]?.status
        )
        return newMessages
      })
    },
    []
  )

  /**
   * Process section progress events
   */
  const processSectionEvent = useCallback((data: any) => {
    if (data.type === 'section_start') {
      setStreamingSections(prev => {
        const existing = prev.find(s => s.id === data.section)
        if (existing) {
          return prev.map(s =>
            s.id === data.section
              ? { ...s, status: 'in_progress' as const, startTime: Date.now() }
              : s
          )
        }
        return [
          ...prev,
          {
            id: data.section,
            label: data.label || data.section,
            status: 'in_progress' as const,
            startTime: Date.now(),
          },
        ]
      })
    } else if (data.type === 'section_complete') {
      setStreamingSections(prev =>
        prev.map(s =>
          s.id === data.section
            ? {
              ...s,
              status: 'completed' as const,
              endTime: Date.now(),
              details: data.preview || data.details,
            }
            : s
        )
      )
    } else if (data.type === 'section_error') {
      setStreamingSections(prev =>
        prev.map(s =>
          s.id === data.section
            ? {
              ...s,
              status: 'error' as const,
              endTime: Date.now(),
              details: data.error,
            }
            : s
        )
      )
    }
  }, [])

  /**
   * Process citation events
   */
  const processCitationEvent = useCallback(
    (data: any) => {
      if (data.type === 'citation' || data.type === 'citations') {
        const newCitations: Citation[] = Array.isArray(data.citations)
          ? data.citations
          : [data.citation]

        setCitations(prev => {
          const existingIds = new Set(prev.map(c => c.id))
          const unique = newCitations.filter(c => !existingIds.has(c.id))
          return [...prev, ...unique]
        })

        if (onCitationsUpdate) {
          onCitationsUpdate(newCitations)
        }
      } else if (data.type === 'grounding') {
        setGroundingScore(data.score)
        if (onGroundingUpdate) {
          onGroundingUpdate(data.score, data.details)
        }
      }
    },
    [onCitationsUpdate, onGroundingUpdate]
  )

  const processStream = useCallback(
    async (
      res: Response,
      signal: AbortSignal,
      initialRoundCount: number = 0,
      pendingActionsRef?: React.MutableRefObject<number>
    ) => {
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let localRoundCount = initialRoundCount

      if (!reader) return

      // Reset citations for new stream
      setCitations([])
      setGroundingScore(null)

      try {
        while (true) {
          if (signal.aborted) {
            reader.cancel()
            break
          }

          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))

                // Notify external listeners
                if (onStreamingUpdate) onStreamingUpdate(data)

                // Process by event type
                if (data.type === 'start') {
                  setThinkingAgent('Processing')
                  setStreamingTokens('')
                  streamingTokensRef.current = ''
                  setStreamingSections([])
                  setIsTokenStreaming(data.streamMode === 'events')
                  setCitations([])
                  setGroundingScore(null)

                  // Initialize an empty AI message immediately so we can start logging activity to it
                  setMessages(prev => {
                    const lastMsg = prev[prev.length - 1]

                    console.log('[useChatStream] Stream Start - Last Msg:', {
                      sender: lastMsg?.sender,
                      type: lastMsg?.type,
                      content: lastMsg?.content?.slice(0, 20)
                    })

                    // If last message is already AI and empty, reuse it
                    if (lastMsg && lastMsg.type === 'ai' && !lastMsg.content && !lastMsg.activityLog) {
                      return prev
                    }
                    // Add new placeholder AI message
                    return [...prev, {
                      sender: 'Storyteller',
                      content: '',
                      type: 'ai',
                      activityLog: []
                    }]
                  })
                } else if (data.type === 'token') {
                  setStreamingTokens(prev => {
                    const next = prev + (data.token || '')
                    streamingTokensRef.current = next
                    return next
                  })
                } else if (data.type === 'node' || data.type === 'node_start') {
                  const agentName = data.node || data.agent
                  setThinkingAgent(agentName)
                  updateAgentStatus(agentName, 'thinking', 'Processing...')
                } else if (data.type === 'node_complete') {
                  const agentName = data.node || data.agent
                  updateAgentStatus(agentName, 'complete')
                  setStreamingTokens('')
                } else if (data.type.startsWith('section_')) {
                  processSectionEvent(data)
                } else if (
                  data.type === 'citation' ||
                  data.type === 'citations' ||
                  data.type === 'grounding'
                ) {
                  processCitationEvent(data)
                } else if (data.type === 'agent_status') {
                  updateAgentStatus(data.agent, data.status, data.message, data.details)

                  // Persist status to Activity Log
                  const entry: ActivityLogEntry = {
                    type: 'status',
                    agent: data.agent,
                    content: data.message,
                    timestamp: Date.now(),
                    details: data.details
                  }
                  appendActivityLog(entry)

                } else if (data.type === 'tool_result' || data.type === 'tool_call') {
                  // Handle explicit tool events if they come through stream
                  const entry: ActivityLogEntry = {
                    type: 'tool',
                    toolName: data.toolName || data.tool,
                    toolInput: data.args || data.input,
                    toolResult: data.result,
                    timestamp: Date.now()
                  }
                  appendActivityLog(entry)

                } else if (data.type === 'thinking') {
                  // Extended thinking/reasoning from agent - attach to current message and activity log
                  const thinking = data.thinking || ''
                  const agentName = data.agent || thinkingAgent || 'Agent'

                  if (thinking) {
                    // 1. Add to persistent activity log for timeline view
                    appendActivityLog({
                      type: 'thinking',
                      agent: agentName,
                      content: thinking,
                      timestamp: data.timestamp || Date.now()
                    })

                    // 2. Add to message thinking entries for the dedicated thinking UI
                    setMessages(prev => {
                      const lastMsg = prev[prev.length - 1]
                      if (lastMsg && lastMsg.type === 'ai') {
                        const existingThinkingEntries = lastMsg.additional_kwargs?.thinkingEntries || []
                        const newEntry = { agent: agentName, content: thinking, timestamp: data.timestamp || Date.now() }
                        const updatedEntries = [...existingThinkingEntries, newEntry]

                        const formattedThinking = updatedEntries
                          .map(entry => `[${entry.agent}]\n${entry.content}`)
                          .join('\n\n---\n\n')

                        return [
                          ...prev.slice(0, -1),
                          {
                            ...lastMsg,
                            thinking: formattedThinking,
                            additional_kwargs: {
                              ...lastMsg.additional_kwargs,
                              thinking: formattedThinking,
                              thinkingEntries: updatedEntries,
                              hasThinking: true,
                            }
                          }
                        ]
                      }
                      return prev
                    })
                  }
                } else if (data.type === 'message') {
                  setThinkingAgent(data.node || data.agent)
                  setMessages(prev => {
                    // Dedupe - add null checks for safety
                    const exists = prev.some(
                      existing =>
                        existing?.sender === data.message?.sender &&
                        existing?.content === data.message?.content &&
                        existing?.type === data.message?.type &&
                        data.message?.type !== 'system'
                    )
                    if (exists || !data.message) return prev

                    // Attach citations if available
                    const messageWithCitations = {
                      ...data.message,
                      citations: data.citations || data.message.citations,
                    }

                    return [...prev, messageWithCitations]
                  })

                  if (data.message.type === 'ai') {
                    localRoundCount++
                    setRoundCount(localRoundCount)
                  }
                } else if (data.type === 'action') {
                  const actionObj = data.action
                  console.log(
                    '[useChatStream] Action received:',
                    actionObj?.type,
                    actionObj?.payload?.label || actionObj?.payload?.id
                  )

                  // Persist action to Activity Log
                  const entry: ActivityLogEntry = {
                    type: 'action',
                    agent: thinkingAgent || data.node || data.agent,
                    content: actionObj.reasoning || 'Proposed Action',
                    details: actionObj,
                    timestamp: Date.now()
                  }
                  appendActivityLog(entry)

                  // 1. Add action to the current message state so it persists
                  setMessages(prev => {
                    const lastMsg = prev[prev.length - 1]
                    // If last message is from this agent, attach action
                    if (lastMsg && lastMsg.type === 'ai' && lastMsg.sender === (thinkingAgent || data.node || data.agent)) {
                      const updatedActions = [...(lastMsg.actions || []), { ...actionObj, status: 'pending' }]
                      return [
                        ...prev.slice(0, -1),
                        { ...lastMsg, actions: updatedActions }
                      ]
                    }
                    // Otherwise create a new message for the action
                    return [
                      ...prev,
                      {
                        sender: thinkingAgent || data.node || data.agent || 'System',
                        content: '', // Action-only message
                        type: 'ai',
                        actions: [{ ...actionObj, status: 'pending' }]
                      }
                    ]
                  })

                  // 2. Still call onAction for side effects, allowing manual handling if needed
                  if (onAction) {
                    const promise = onAction(actionObj)
                    if (pendingActionsRef) pendingActionsRef.current++
                    promise.finally(() => {
                      if (pendingActionsRef) pendingActionsRef.current--
                    })
                  }
                } else if (data.type === 'questions') {
                  if (onQuestion && data.questions && data.questions.length > 0) {
                    data.questions.forEach((q: AgentQuestion) => {
                      onQuestion({
                        id: q.id,
                        question: q,
                        status: 'pending',
                        // Include workflow context for resume
                        workflowRunId: data.workflowRunId,
                        workflowStepId: data.workflowStepId,
                      })
                    })

                    if (data.questions.some((q: AgentQuestion) => q.urgency === 'blocking')) {
                      setIsAwaitingInput(true)
                    }
                  }
                } else if (data.type === 'awaiting_input') {
                  setIsAwaitingInput(true)
                  setThinkingAgent(null)
                  setIsTokenStreaming(false)
                  setStreamingTokens('')
                } else if (data.type === 'info') {
                  // Info notification (e.g., episode created)
                  console.log(`[useChatStream] Info:`, data.message)
                  if (onStreamingUpdate) onStreamingUpdate(data)
                } else if (data.type === 'navigation') {
                  // Navigation signal (e.g., open beat board)
                  console.log(`[useChatStream] Navigation:`, data.action, data.episodeId)
                  if (onStreamingUpdate) onStreamingUpdate(data)
                  // Could trigger router.push() here if we have access to router
                } else if (data.type === 'state') {
                  // State update from loop creator or similar
                  // Could emit this to external handler
                  if (onStreamingUpdate) onStreamingUpdate(data)
                } else if (data.type === 'section_loading') {
                  // Section-specific loading state (soundtracks, factions, etc.)
                  const { section, loading, message } = data
                  console.log(`[useChatStream] Section loading: ${section} = ${loading}`)

                  setLoadingSections(prev => ({
                    ...prev,
                    [section]: { loading, message }
                  }))

                  // Notify external handler
                  onSectionLoading?.(section, loading, message)
                } else if (
                  data.type === 'complete' ||
                  data.type === 'done' ||
                  data.type === 'terminated'
                ) {
                  // Stream complete - clean up all state
                  setThinkingAgent(null)
                  setIsTokenStreaming(false)
                  setStreamingTokens('')
                  streamingTokensRef.current = ''
                  setStreamingSections([])
                  setIsSending(false)
                  setActiveAgents([])
                  setIsAwaitingInput(false)
                  // Call onComplete callback
                  onComplete?.()
                } else if (data.type === 'error') {
                  // Extract error message from various formats
                  const errorMsg = data.error?.message || data.message || data.error || 'Unknown error'
                  const errorCode = data.error?.code || 'ERROR'

                  console.error(`[useChatStream] Error received: ${errorCode} - ${errorMsg}`)

                  // Special handling for tool chain corruption
                  if (errorMsg.includes('tool') && errorMsg.includes('must be')) {
                    console.warn(
                      '🔄 [useChatStream] Tool chain error detected, clearing session...'
                    )
                    // Clear persisted messages to reset corrupted state
                    if (persistKey && typeof window !== 'undefined') {
                      sessionStorage.removeItem(`chat-messages-${persistKey}`)
                    }
                    setMessages(prev => [
                      ...prev,
                      {
                        sender: 'System',
                        content:
                          '⚠️ Session state was corrupted. Please refresh the page and try again.',
                        type: 'ai',
                      },
                    ])
                  } else {
                    // Format error message nicely for display
                    let displayMessage = `❌ **Error:** ${errorMsg}`

                    // Add helpful context for known errors
                    if (errorCode === 'QUOTA_EXCEEDED' || errorMsg.includes('quota')) {
                      displayMessage = '⚠️ **API Quota Exceeded**\n\nThe AI service has reached its usage limit. Please:\n- Check your OpenAI billing settings\n- Wait a few minutes and try again\n- Contact support if the issue persists'
                    } else if (errorMsg.includes('rate limit')) {
                      displayMessage = '⏳ **Rate Limited**\n\nToo many requests. Please wait a moment and try again.'
                    } else if (errorMsg.includes('network') || errorMsg.includes('timeout')) {
                      displayMessage = '🌐 **Connection Error**\n\nCouldn\'t reach the AI service. Please check your internet connection and try again.'
                    }

                    setMessages(prev => [
                      ...prev,
                      {
                        sender: 'System',
                        content: displayMessage,
                        type: 'system', // Changed from 'error' to 'system' to match Message type
                      },
                    ])
                  }
                  // Ensure cleanup on error event
                  setThinkingAgent(null)
                  setIsTokenStreaming(false)
                  setStreamingTokens('')
                  streamingTokensRef.current = ''
                  setStreamingSections([])
                  setIsSending(false)
                  setActiveAgents([])
                  setIsAwaitingInput(false)
                  // Call onComplete callback
                  onComplete?.()
                }
              } catch (e) {
                // ignore parse error
              }
            }
          }
        }
      } catch (error: any) {
        console.error('Stream error', error)
      } finally {
        // Try to parse any remaining tokens as action (only if not aborted)
        if (!signal.aborted && streamingTokensRef.current) {
          try {
            const potentialJson = streamingTokensRef.current.trim()
            if (potentialJson.startsWith('{') && potentialJson.endsWith('}')) {
              const data = JSON.parse(potentialJson)
              if (data.type && onAction) {
                onAction(data)
              }
            }
          } catch (e) {
            // Not JSON
          }

          // NEW: Flush remaining tokens to a message if it's not JSON and looks like narrative text
          // OR if it's a broken JSON, extract the message part.
          // This prevents text from vanishing if the stream ends without a formal 'message' event
          const text = streamingTokensRef.current.trim()
          if (text) {
            let finalContent = text
            let shouldFlush = true

            // If it looks like JSON, try to extract the message field even if broken
            if (text.startsWith('{')) {
              // More robust regex: look for "message" key and capture the string value,
              // handling escaped quotes and cross-line content.
              const messageMatch = text.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"?/)
              if (messageMatch) {
                // Unescape the captured string
                finalContent = messageMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n')
              } else {
                // It's technical JSON without a message, don't flush as narrative
                shouldFlush = false
              }
            }

            if (shouldFlush) {
              setMessages(prev => {
                const lastMsg = prev[prev.length - 1]
                // If the last message is already this text (dedupe), don't append
                if (lastMsg && lastMsg.content === finalContent) return prev

                return [
                  ...prev,
                  {
                    sender: thinkingAgent || 'Agent',
                    content: finalContent,
                    type: 'ai',
                  },
                ]
              })
            }
          }
        }

        // ALWAYS clean up state, regardless of abort
        setThinkingAgent(null)
        setIsTokenStreaming(false)
        setStreamingTokens('')
        streamingTokensRef.current = ''
        setStreamingSections([])
        setIsSending(false)
        setActiveAgents([])
        setIsAwaitingInput(false)
        // Call onComplete callback
        onComplete?.()
      }
    },
    [
      onAction,
      onQuestion,
      onStreamingUpdate,
      onComplete,
      updateAgentStatus,
      processSectionEvent,
      processCitationEvent,
    ]
  )

  const sendMessage = useCallback(
    async (endpoint: string, payload: any, customHeaders: Record<string, string> = {}) => {
      setIsSending(true)
      abortControllerRef.current = new AbortController()

      try {
        // Inject session context into payload for Langfuse session tracking
        const payloadWithSession = {
          ...payload,
          sessionId,
          ...(userId && { userId }),
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...customHeaders },
          body: JSON.stringify(payloadWithSession),
          signal: abortControllerRef.current.signal,
        })
        await processStream(res, abortControllerRef.current.signal, roundCount)
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Failed to send message:', error)
          // Check for common dev-mode issues
          const isDevReload =
            error.message?.includes('network error') ||
            error.message?.includes('incomplete') ||
            error.message?.includes('chunked')
          const errorMessage = isDevReload
            ? 'Connection interrupted (possibly due to Hot Reload). Please try again.'
            : 'Failed to send message. Please try again.'
          setMessages(prev => [
            ...prev,
            {
              sender: 'System',
              content: errorMessage,
              type: 'system',
            },
          ])
        }
        // Always clean up on any error (including AbortError)
        setIsSending(false)
        setThinkingAgent(null)
        setIsTokenStreaming(false)
        setStreamingTokens('')
        setActiveAgents([])
      }
    },
    [processStream, roundCount, sessionId, userId]
  )

  /**
   * Clear citations
   */
  const clearCitations = useCallback(() => {
    setCitations([])
    setGroundingScore(null)
  }, [])

  // Function to dismiss interrupted stream warning
  const dismissInterruptedWarning = useCallback(() => {
    setWasStreamingOnLoad(false)
    if (persistKey) {
      clearInterruptedStream(persistKey)
    }
  }, [persistKey])

  /**
   * Resume a suspended workflow with user's choice
   * Called when user answers a question from the Writers Room
   */
  const resumeWorkflow = useCallback(
    async (
      runId: string,
      selectedOption: string,
      additionalFeedback?: string
    ): Promise<boolean> => {
      try {
        const response = await fetch('/api/storyteller/workflow/resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId,
            selectedOption,
            additionalFeedback,
          }),
        })

        if (!response.ok) {
          console.error('[useChatStream] Failed to resume workflow:', await response.text())
          return false
        }

        const result = await response.json()
        console.log('[useChatStream] Workflow resumed:', result)

        // Clear awaiting input state
        setIsAwaitingInput(false)

        return true
      } catch (error) {
        console.error('[useChatStream] Error resuming workflow:', error)
        return false
      }
    },
    []
  )

  return {
    // Core state
    messages,
    setMessages,
    isSending,
    setIsSending,
    thinkingAgent,

    // Actions
    stopStream,
    sendMessage,
    processStream,
    clearCitations,
    dismissInterruptedWarning,
    resumeWorkflow,

    // Streaming state
    streamingTokens,
    streamingSections,
    wasStreamingOnLoad,
    isTokenStreaming,
    isAwaitingInput,
    setIsAwaitingInput,

    // Agent status
    activeAgents,
    updateAgentStatus,

    // Action approval
    updateActionStatus,

    // Citations
    citations,
    groundingScore,

    // Refs
    abortControllerRef,

    // Round tracking
    roundCount,

    // Section-specific loading states
    loadingSections,
    setLoadingSections,

    // Session tracking (for Langfuse)
    sessionId,
  }
}
