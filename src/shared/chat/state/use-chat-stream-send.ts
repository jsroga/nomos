import { useRef, useCallback } from 'react'
import type { MutableRefObject } from 'react'
import { getErrorMessage, toError } from '@/shared/errors/error-utils'
import {
  ChatMessageRole,
  ChatMessageSender,
  CHAT_HOT_RELOAD_ERROR_MESSAGE,
  CHAT_SEND_MESSAGE_FAILED,
  CHAT_STREAM_STOPPED_MESSAGE,
} from '../core/constants/chat-messages'
import { DomExceptionName, FetchErrorPattern } from '../core/constants/chat-stream'
import { postChatStream } from '../core/io/chat-ui.api'
import { USE_CHAT_STREAM_LOG_SEND_FAILED } from './constants/use-chat-stream-log'
import type { Message } from '../core/types'
import type { AgentStatusInfo } from '../ui/AgentLog'
import type { ProgressSection } from '../ui/SectionProgress'

interface ProcessStreamFn {
  (
    res: Response,
    signal: AbortSignal,
    initialRoundCount?: number,
    pendingActionsRef?: MutableRefObject<number>
  ): Promise<void>
}

interface UseChatStreamSendOptions {
  sessionId: string
  userId?: string
  roundCount: number
  setIsSending: React.Dispatch<React.SetStateAction<boolean>>
  processStream: ProcessStreamFn
  setMessages: (updater: Message[] | ((prev: Message[]) => Message[])) => void
  setStreamingTokens: React.Dispatch<React.SetStateAction<string>>
  setThinkingAgent: React.Dispatch<React.SetStateAction<string | null>>
  setIsTokenStreaming: React.Dispatch<React.SetStateAction<boolean>>
  setStreamingSections: React.Dispatch<React.SetStateAction<ProgressSection[]>>
  setIsAwaitingInput: React.Dispatch<React.SetStateAction<boolean>>
  setActiveAgents: React.Dispatch<React.SetStateAction<AgentStatusInfo[]>>
}

export function useChatStreamSend({
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
}: UseChatStreamSendOptions) {
  const abortControllerRef = useRef<AbortController | null>(null)

  const resetStreamUi = useCallback(() => {
    setIsSending(false)
    setThinkingAgent(null)
    setIsTokenStreaming(false)
    setStreamingTokens('')
    setActiveAgents([])
  }, [
    setActiveAgents,
    setIsSending,
    setIsTokenStreaming,
    setStreamingTokens,
    setThinkingAgent,
  ])

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    resetStreamUi()
    setStreamingSections([])
    setIsAwaitingInput(false)

    setMessages(prev => [
      ...prev,
      {
        sender: ChatMessageSender.System,
        content: CHAT_STREAM_STOPPED_MESSAGE,
        type: ChatMessageRole.Ai,
      },
    ])
  }, [resetStreamUi, setIsAwaitingInput, setMessages, setStreamingSections])

  const sendMessage = useCallback(
    async (
      endpoint: string,
      payload: Record<string, unknown>,
      customHeaders: Record<string, string> = {}
    ) => {
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
          const message = getErrorMessage(error)
          const isDevReload =
            message?.includes(FetchErrorPattern.NetworkError) ||
            message?.includes(FetchErrorPattern.Incomplete) ||
            message?.includes(FetchErrorPattern.Chunked)
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
        resetStreamUi()
      }
    },
    [processStream, resetStreamUi, roundCount, sessionId, setMessages, setIsSending, userId]
  )

  return {
    abortControllerRef,
    stopStream,
    sendMessage,
  }
}
