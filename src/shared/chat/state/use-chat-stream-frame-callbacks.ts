import { useCallback, useRef } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type {
  ActivityLogEntry,
  AgentAction,
  Message,
  QuestionSession,
} from '../core/types'
import type { AgentStatus, AgentStatusInfo } from '../ui/AgentLog'
import type { Citation } from '../ui/CitationDisplay'
import type { ProgressSection } from '../ui/SectionProgress'
import { processSectionEventData } from './chat-stream-section-events'
import { processCitationEventData } from './chat-stream-citation-events'
import { processChatStreamResponse } from './chat-stream-process'
import type { ChatStreamFrameContext } from './chat-stream-frame-context'
import {
  appendActivityLogEntry,
  updateActiveAgentStatus,
} from './chat-stream-message-updaters'
import { useChatStreamActionCallbacks } from './use-chat-stream-action-callbacks'

interface UseChatStreamFrameCallbacksOptions {
  verboseUiRef: MutableRefObject<boolean>
  streamingTokensRef: MutableRefObject<string>
  thinkingAgent: string | null
  persistKey?: string
  setMessagesInternal: Dispatch<SetStateAction<Message[]>>
  setMessages: (updater: Message[] | ((prev: Message[]) => Message[])) => void
  setThinkingAgent: Dispatch<SetStateAction<string | null>>
  setStreamingTokens: Dispatch<SetStateAction<string>>
  setStreamingSections: Dispatch<SetStateAction<ProgressSection[]>>
  setIsTokenStreaming: Dispatch<SetStateAction<boolean>>
  setCitations: Dispatch<SetStateAction<Citation[]>>
  setGroundingScore: Dispatch<SetStateAction<number | null>>
  setRoundCount: Dispatch<SetStateAction<number>>
  setIsAwaitingInput: Dispatch<SetStateAction<boolean>>
  setLoadingSections: Dispatch<
    SetStateAction<Record<string, { loading: boolean; message?: string }>>
  >
  setIsSending: Dispatch<SetStateAction<boolean>>
  setActiveAgents: Dispatch<SetStateAction<AgentStatusInfo[]>>
  scheduleTokenFlush: () => void
  cancelTokenFlush: () => void
  onAction?: (action: AgentAction) => Promise<void>
  onQuestion?: (question: QuestionSession) => void
  onStreamingUpdate?: (data: Record<string, unknown>) => void
  onComplete?: () => void
  onSectionLoading?: (section: string, loading: boolean, message?: string) => void
  onCitationsUpdate?: (citations: Citation[]) => void
  onGroundingUpdate?: (score: number, details: Record<string, unknown>) => void
}

export function useChatStreamFrameCallbacks({
  verboseUiRef,
  streamingTokensRef,
  thinkingAgent,
  persistKey,
  setMessagesInternal,
  setMessages,
  setThinkingAgent,
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
  scheduleTokenFlush,
  cancelTokenFlush,
  onAction,
  onQuestion,
  onStreamingUpdate,
  onComplete,
  onSectionLoading,
  onCitationsUpdate,
  onGroundingUpdate,
}: UseChatStreamFrameCallbacksOptions) {
  const localRoundCountRef = useRef(0)

  const { updateActionStatus, updateActionStatusById, syncActionStatus } =
    useChatStreamActionCallbacks(setMessagesInternal)

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
    [setActiveAgents, verboseUiRef]
  )

  const processSectionEvent = useCallback(
    (data: Record<string, unknown>) => {
      processSectionEventData(verboseUiRef, setStreamingSections, data)
    },
    [setStreamingSections, verboseUiRef]
  )

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
    [onCitationsUpdate, onGroundingUpdate, setCitations, setGroundingScore]
  )

  const processStream = useCallback(
    async (
      res: Response,
      signal: AbortSignal,
      initialRoundCount: number = 0,
      pendingActionsRef?: MutableRefObject<number>
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
      appendActivityLog,
      cancelTokenFlush,
      onAction,
      onComplete,
      onQuestion,
      onSectionLoading,
      onStreamingUpdate,
      persistKey,
      processCitationEvent,
      processSectionEvent,
      scheduleTokenFlush,
      setActiveAgents,
      setCitations,
      setGroundingScore,
      setIsAwaitingInput,
      setIsSending,
      setIsTokenStreaming,
      setLoadingSections,
      setMessages,
      setRoundCount,
      setStreamingSections,
      setStreamingTokens,
      setThinkingAgent,
      streamingTokensRef,
      thinkingAgent,
      updateAgentStatus,
      verboseUiRef,
    ]
  )

  return {
    processStream,
    updateAgentStatus,
    updateActionStatus,
    updateActionStatusById,
    syncActionStatus,
  }
}
