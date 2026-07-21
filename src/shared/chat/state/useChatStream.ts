/**
 * useChatStream Hook — token streaming, section progress, agent status, citations.
 */

import { useState, useCallback } from 'react'
import { generateSessionId } from '@/shared/data/trace-session'
import { DEFAULT_RESUME_URL } from '../core/constants/chat-stream'
import { useChatStreamTokenBuffer } from './use-chat-stream-token-buffer'
import { useChatStreamPersistenceEffects } from './use-chat-stream-persistence-effects'
import { useChatStreamMessages } from './use-chat-stream-messages'
import { useChatStreamUiState } from './use-chat-stream-ui-state'
import { useChatStreamFrameCallbacks } from './use-chat-stream-frame-callbacks'
import { useChatStreamSend } from './use-chat-stream-send'
import { useChatStreamResume } from './use-chat-stream-resume'
import type { UseChatStreamProps } from './use-chat-stream-types'

export type { UseChatStreamProps } from './use-chat-stream-types'

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
  const [isSending, setIsSending] = useState(false)

  const { messages, setMessages, setMessagesInternal } = useChatStreamMessages(
    persistKey,
    initialMessages
  )

  const uiState = useChatStreamUiState()
  const {
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
  } = uiState

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

  const {
    wasStreamingOnLoad,
    setWasStreamingOnLoad,
    dismissInterruptedWarning,
    resumeWorkflow: resumeWorkflowBase,
  } = useChatStreamResume({ persistKey, resumeUrl })

  const {
    processStream,
    updateAgentStatus,
    updateActionStatus,
    updateActionStatusById,
    syncActionStatus,
  } = useChatStreamFrameCallbacks({
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
  })

  const { abortControllerRef, stopStream, sendMessage } = useChatStreamSend({
    sessionId,
    userId,
    roundCount,
    setIsSending,
    processStream,
    setMessages,
    setStreamingTokens,
    setThinkingAgent,
    setIsTokenStreaming,
    setStreamingSections,
    setIsAwaitingInput,
    setActiveAgents,
  })

  useChatStreamPersistenceEffects({
    persistKey,
    messages,
    isSending,
    thinkingAgent,
    setMessagesInternal,
    setWasStreamingOnLoad,
  })

  const resumeWorkflow = useCallback(
    async (
      runId: string,
      selectedOption: string,
      additionalFeedback?: string
    ): Promise<boolean> => {
      const ok = await resumeWorkflowBase(runId, selectedOption, additionalFeedback)
      if (ok) {
        setIsAwaitingInput(false)
      }
      return ok
    },
    [resumeWorkflowBase, setIsAwaitingInput]
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
