import { useEffect, useRef } from 'react'
import {
  saveChatState,
  loadChatState,
  saveInterruptedStream,
  loadInterruptedStream,
} from '@/shared/data/chat-persistence'
import {
  ChatMessageSender,
  CHAT_BEFORE_UNLOAD_WARNING,
  CHAT_INTERRUPTED_PROCESSING_TASK,
  CHAT_INTERRUPTED_TASK_LABEL,
} from '../core/constants/chat-messages'
import {
  BrowserWindowEvent,
  CHAT_MESSAGES_STORAGE_PREFIX,
} from '../core/constants/chat-stream'
import {
  USE_CHAT_STREAM_LOG_FAILED_RESTORE,
  USE_CHAT_STREAM_LOG_INTERRUPTED_RELOAD,
  USE_CHAT_STREAM_LOG_RESTORED_MESSAGES,
  USE_CHAT_STREAM_LOG_RESTORED_STREAMING_STATE,
} from './constants/use-chat-stream-log'
import type { Message } from '../core/types'

interface UseChatStreamPersistenceEffectsOptions {
  persistKey?: string
  messages: Message[]
  isSending: boolean
  thinkingAgent: string | null
  setMessagesInternal: React.Dispatch<React.SetStateAction<Message[]>>
  setWasStreamingOnLoad: React.Dispatch<React.SetStateAction<boolean>>
}

export function useChatStreamPersistenceEffects({
  persistKey,
  messages,
  isSending,
  thinkingAgent,
  setMessagesInternal,
  setWasStreamingOnLoad,
}: UseChatStreamPersistenceEffectsOptions): void {
  useEffect(() => {
    if (persistKey && typeof window !== 'undefined') {
      try {
        const storedMessages = sessionStorage.getItem(`${CHAT_MESSAGES_STORAGE_PREFIX}${persistKey}`)
        if (storedMessages) {
          const parsed = JSON.parse(storedMessages)
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log(
              `${USE_CHAT_STREAM_LOG_RESTORED_MESSAGES} ${parsed.length} messages for key: ${persistKey}`
            )
            setMessagesInternal(parsed)
          }
        }
      } catch (e) {
        console.error(USE_CHAT_STREAM_LOG_FAILED_RESTORE, e)
      }

      const savedState = loadChatState(persistKey)
      if (savedState) {
        console.log(USE_CHAT_STREAM_LOG_RESTORED_STREAMING_STATE)

        if (savedState.isSending) {
          setWasStreamingOnLoad(true)
          console.log(USE_CHAT_STREAM_LOG_INTERRUPTED_RELOAD)

          const interrupted = loadInterruptedStream(persistKey)
          if (!interrupted) {
            saveInterruptedStream(persistKey, {
              streamId: `stream-${Date.now()}`,
              threadId: persistKey,
              timestamp: Date.now(),
              agent: savedState.thinkingAgent || ChatMessageSender.Unknown,
              task: CHAT_INTERRUPTED_TASK_LABEL,
            })
          }
        }
      }
    }
  }, [persistKey, setMessagesInternal, setWasStreamingOnLoad])

  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPersistedMsgCountRef = useRef(0)
  useEffect(() => {
    if (!persistKey || typeof window === 'undefined') return

    if (isSending && messages.length === lastPersistedMsgCountRef.current) return

    if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    const delay = isSending ? 3000 : 500
    persistTimerRef.current = setTimeout(() => {
      try {
        lastPersistedMsgCountRef.current = messages.length
        saveChatState(persistKey, {
          messages,
          isSending,
          thinkingAgent,
          streamingTokens: '',
        })
      } catch {
        // quota or serialization error - silently ignore
      }
    }, delay)

    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    }
  }, [messages, isSending, thinkingAgent, persistKey])

  useEffect(() => {
    if (!persistKey || typeof window === 'undefined') return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSending && thinkingAgent) {
        e.preventDefault()
        e.returnValue = CHAT_BEFORE_UNLOAD_WARNING

        saveInterruptedStream(persistKey, {
          streamId: `stream-${Date.now()}`,
          threadId: persistKey,
          timestamp: Date.now(),
          agent: thinkingAgent,
          task: CHAT_INTERRUPTED_PROCESSING_TASK,
        })
      }
    }

    window.addEventListener(BrowserWindowEvent.BeforeUnload, handleBeforeUnload)
    return () => window.removeEventListener(BrowserWindowEvent.BeforeUnload, handleBeforeUnload)
  }, [isSending, thinkingAgent, persistKey])
}

export function loadInitialChatMessages(
  persistKey: string | undefined,
  initialMessages: Message[]
): Message[] {
  if (persistKey && typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(`${CHAT_MESSAGES_STORAGE_PREFIX}${persistKey}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`${USE_CHAT_STREAM_LOG_RESTORED_MESSAGES} ${parsed.length} messages from sessionStorage`)
          return parsed
        }
      }
    } catch (e) {
      console.error(USE_CHAT_STREAM_LOG_FAILED_RESTORE, e)
    }
  }
  return initialMessages
}
