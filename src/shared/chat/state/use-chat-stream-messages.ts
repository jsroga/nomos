import { useState, useCallback } from 'react'
import type { Message } from '../core/types'
import { CHAT_DEBUG_ENABLED } from '../core/constants/chat-stream'
import { loadInitialChatMessages } from './use-chat-stream-persistence-effects'
import {
  USE_CHAT_STREAM_LOG_MESSAGE_COUNT_DECREASED,
  USE_CHAT_STREAM_LOG_SET_MESSAGES,
  USE_CHAT_STREAM_LOG_STACK_TRACE,
} from './constants/use-chat-stream-log'

const CHAT_DEBUG = process.env.NEXT_PUBLIC_CHAT_DEBUG === CHAT_DEBUG_ENABLED

export function useChatStreamMessages(
  persistKey: string | undefined,
  initialMessages: Message[]
) {
  const [messages, setMessagesInternal] = useState<Message[]>(() =>
    loadInitialChatMessages(persistKey, initialMessages)
  )

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

  return { messages, setMessages, setMessagesInternal }
}
