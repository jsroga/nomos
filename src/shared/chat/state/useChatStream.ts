/**
 * useChatStream Hook — token streaming, section progress, agent status, citations.
 */

import { useState, useRef, useCallback } from 'react'
import {
  Message,
  AgentAction,
  ActionStatus,
  ActivityLogEntry,
  type ActionMessageLocation,
} from '../core/types'
import { AgentStatusInfo, AgentStatus } from '../ui/AgentLog'
import { Citation } from '../ui/CitationDisplay'
import { ProgressSection } from '../ui/SectionProgress'
import { clearInterruptedStream } from '@/shared/data/chat-persistence'
import { generateSessionId } from '@/shared/data/trace-session'
import { getErrorMessage, toError } from '@/shared/errors/error-utils'
import {
  ChatMessageRole,
  ChatMessageSender,
  CHAT_HOT_RELOAD_ERROR_MESSAGE,
  CHAT_SEND_MESSAGE_FAILED,
  CHAT_STREAM_STOPPED_MESSAGE,
} from '../core/constants/chat-messages'
import {
  CHAT_DEBUG_ENABLED,
  DEFAULT_RESUME_URL,
  DomExceptionName,
  FetchErrorPattern,
} from '../core/constants/chat-stream'
import { postChatStream, resumeChatWorkflow } from '../core/io/chat-ui.api'
import {
  USE_CHAT_STREAM_LOG_MESSAGE_COUNT_DECREASED,
  USE_CHAT_STREAM_LOG_RESUME_ERROR,
  USE_CHAT_STREAM_LOG_RESUME_FAILED,
  USE_CHAT_STREAM_LOG_SEND_FAILED,
  USE_CHAT_STREAM_LOG_SET_MESSAGES,
  USE_CHAT_STREAM_LOG_STACK_TRACE,
  USE_CHAT_STREAM_LOG_WORKFLOW_RESUMED,
} from './constants/use-chat-stream-log'
import { processSectionEventData } from './chat-stream-section-events'
import { processCitationEventData } from './chat-stream-citation-events'
import { processChatStreamResponse } from './chat-stream-process'
import type { ChatStreamFrameContext } from './chat-stream-frame-context'
import {
  appendActivityLogEntry,
  updateActiveAgentStatus,
} from './chat-stream-message-updaters'
import {
  updateActionStatusInMessages,
  updateActionStatusByIdInMessages,
  syncActionStatusInMessages,
} from './chat-stream-action-status'
import { useChatStreamTokenBuffer } from './use-chat-stream-token-buffer'
import {
  loadInitialChatMessages,
  useChatStreamPersistenceEffects,
} from './use-chat-stream-persistence-effects'
import type { UseChatStreamProps } from './use-chat-stream-types'

const CHAT_DEBUG = process.env.NEXT_PUBLIC_CHAT_DEBUG === CHAT_DEBUG_ENABLED

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
  verboseUiEnabled = true,
  resumeUrl = DEFAULT_RESUME_URL,
}: UseChatStreamProps = {}) {
  const sessionId = propSessionId || generateSessionId(projectId, episodeId, userId)

  const [messages, setMessagesInternal] = useState<Message[]>(() =>
    loadInitialChatMessages(persistKey, initialMessages)
  )
  const [wasStreamingOnLoad, setWasStreamingOnLoad] = useState(false)

  const setMessages = useCallback((updater: Message[] | ((prev: Message[]) => Message[])) => {
    setMessagesInternal(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (CHAT_DEBUG) {
        console.log(`${USE_CHAT_STREAM_LOG_SET_MESSAGES} ${prev.length} -> ${next.length} messages`)
      }
      if (CHAT_DEBUG && next.length < prev.length && prev.length > 1) {
        console.warn(USE_CHAT_STREAM_LOG_MESSAGE_COUNT_DECREASED)
        console.trace(USE_CHAT_STREAM_LOG_STACK_TRACE)
      }
      return next
    })
  }, [])

  const [isSending, setIsSending] = useState(false)
  const [thinkingAgent, setThinkingAgent] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const localRoundCountRef = useRef(0)

  const [streamingSections, setStreamingSections] = useState<ProgressSection[]>([])
  const [isTokenStreaming, setIsTokenStreaming] = useState(false)
  const [isAwaitingInput, setIsAwaitingInput] = useState(false)
  const [activeAgents, setActiveAgents] = useState<AgentStatusInfo[]>([])

  const {
    verboseUiRef,
    streamingTokens,
    setStreamingTokens,
    streamingTokensRef,
    scheduleTokenFlush,
    cancelTokenFlush,
  } = useChatStreamTokenBuffer({
    verboseUiEnabled,
    setStreamingSections,
    setActiveAgents,
  })

  const [citations, setCitations] = useState<Citation[]>([])
  const [groundingScore, setGroundingScore] = useState<number | null>(null)
  const [roundCount, setRoundCount] = useState(0)
  const [loadingSections, setLoadingSections] = useState<
    Record<string, { loading: boolean; message?: string }>
  >({})

  useChatStreamPersistenceEffects({
    persistKey,
    messages,
    isSending,
    thinkingAgent,
    setMessagesInternal,
    setWasStreamingOnLoad,
  })

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
        sender: ChatMessageSender.System,
        content: CHAT_STREAM_STOPPED_MESSAGE,
        type: ChatMessageRole.Ai,
      },
    ])
  }, [setMessages, setStreamingTokens])

  const appendActivityLog = useCallback(
    (entry: ActivityLogEntry) => {
      appendActivityLogEntry(verboseUiRef, setMessages, entry)
    },
    [setMessages, verboseUiRef]
  )

  const updateAgentStatus = useCallback(
    (agent: string, status: AgentStatus, message?: string, details?: string) => {
      updateActiveAgentStatus(verboseUiRef, setActiveAgents, agent, status, message, details)
    },
    [verboseUiRef]
  )

  const updateActionStatus = useCallback(
    (messageIndex: number, actionIndex: number, newStatus: ActionStatus) => {
      updateActionStatusInMessages(setMessagesInternal, messageIndex, actionIndex, newStatus)
    },
    []
  )

  const updateActionStatusById = useCallback((actionId: string, newStatus: ActionStatus) => {
    updateActionStatusByIdInMessages(setMessagesInternal, actionId, newStatus)
  }, [])

  const syncActionStatus = useCallback(
    (action: AgentAction, newStatus: ActionStatus, location?: ActionMessageLocation) => {
      syncActionStatusInMessages(
        action,
        newStatus,
        location,
        updateActionStatusById,
        updateActionStatus
      )
    },
    [updateActionStatus, updateActionStatusById]
  )

  const processSectionEvent = useCallback((data: Record<string, unknown>) => {
    processSectionEventData(verboseUiRef, setStreamingSections, data)
  }, [verboseUiRef])

  const processCitationEvent = useCallback(
    (data: Record<string, unknown>) => {
      processCitationEventData(
        setCitations,
        setGroundingScore,
        data,
        onCitationsUpdate,
        onGroundingUpdate
      )
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
      const ctx: ChatStreamFrameContext = {
        verboseUiRef,
        streamingTokensRef,
        thinkingAgent,
        persistKey,
        localRoundCountRef,
        pendingActionsRef,
        setThinkingAgent,
        setMessages,
        setStreamingTokens,
        setStreamingSections,
        setIsTokenStreaming,
        setCitations,
        setGroundingScore,
        setRoundCount,
        setIsAwaitingInput,
        setLoadingSections,
        setIsSending,
        setActiveAgents,
        onAction,
        onQuestion,
        onStreamingUpdate,
        onComplete,
        onSectionLoading,
        updateAgentStatus,
        appendActivityLog,
        processSectionEvent,
        processCitationEvent,
        scheduleTokenFlush,
        cancelTokenFlush,
      }

      await processChatStreamResponse({
        res,
        signal,
        initialRoundCount,
        pendingActionsRef,
        ctx,
        thinkingAgent,
        onAction,
        setMessages,
      })
    },
    [
      thinkingAgent,
      persistKey,
      onAction,
      onQuestion,
      onStreamingUpdate,
      onComplete,
      onSectionLoading,
      updateAgentStatus,
      appendActivityLog,
      processSectionEvent,
      processCitationEvent,
      scheduleTokenFlush,
      cancelTokenFlush,
      setMessages,
      setStreamingTokens,
      streamingTokensRef,
      verboseUiRef,
    ]
  )

  const sendMessage = useCallback(
    async (endpoint: string, payload: Record<string, unknown>, customHeaders: Record<string, string> = {}) => {
      setIsSending(true)
      abortControllerRef.current = new AbortController()

      try {
        const payloadWithSession = {
          ...payload,
          sessionId,
          ...(userId && { userId }),
        }

        const res = await postChatStream(endpoint, payloadWithSession, {
          signal: abortControllerRef.current.signal,
          headers: customHeaders,
        })
        await processStream(res, abortControllerRef.current.signal, roundCount)
      } catch (error: unknown) {
        if (toError(error).name !== DomExceptionName.AbortError) {
          console.error(USE_CHAT_STREAM_LOG_SEND_FAILED, error)
          const isDevReload =
            getErrorMessage(error)?.includes(FetchErrorPattern.NetworkError) ||
            getErrorMessage(error)?.includes(FetchErrorPattern.Incomplete) ||
            getErrorMessage(error)?.includes(FetchErrorPattern.Chunked)
          const errorMessage = isDevReload
            ? CHAT_HOT_RELOAD_ERROR_MESSAGE
            : CHAT_SEND_MESSAGE_FAILED
          setMessages(prev => [
            ...prev,
            {
              sender: ChatMessageSender.System,
              content: errorMessage,
              type: ChatMessageRole.System,
            },
          ])
        }
        setIsSending(false)
        setThinkingAgent(null)
        setIsTokenStreaming(false)
        setStreamingTokens('')
        setActiveAgents([])
      }
    },
    [processStream, roundCount, sessionId, setMessages, setStreamingTokens, userId]
  )

  const clearCitations = useCallback(() => {
    setCitations([])
    setGroundingScore(null)
  }, [])

  const dismissInterruptedWarning = useCallback(() => {
    setWasStreamingOnLoad(false)
    if (persistKey) {
      clearInterruptedStream(persistKey)
    }
  }, [persistKey])

  const resumeWorkflow = useCallback(
    async (
      runId: string,
      selectedOption: string,
      additionalFeedback?: string
    ): Promise<boolean> => {
      try {
        const { ok, result, errorText } = await resumeChatWorkflow(resumeUrl, {
          runId,
          selectedOption,
          additionalFeedback,
        })

        if (!ok) {
          console.error(USE_CHAT_STREAM_LOG_RESUME_FAILED, errorText)
          return false
        }

        console.log(USE_CHAT_STREAM_LOG_WORKFLOW_RESUMED, result)
        setIsAwaitingInput(false)
        return true
      } catch (error) {
        console.error(USE_CHAT_STREAM_LOG_RESUME_ERROR, error)
        return false
      }
    },
    [resumeUrl]
  )

  return {
    messages,
    setMessages,
    isSending,
    setIsSending,
    thinkingAgent,
    stopStream,
    sendMessage,
    processStream,
    clearCitations,
    dismissInterruptedWarning,
    resumeWorkflow,
    streamingTokens,
    streamingSections,
    wasStreamingOnLoad,
    isTokenStreaming,
    isAwaitingInput,
    setIsAwaitingInput,
    activeAgents,
    updateAgentStatus,
    updateActionStatus,
    updateActionStatusById,
    syncActionStatus,
    citations,
    groundingScore,
    abortControllerRef,
    roundCount,
    loadingSections,
    setLoadingSections,
    sessionId,
  }
}
