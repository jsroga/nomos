/**
 * Chat Persistence Utilities
 *
 * Handles saving and restoring chat state across page reloads and navigation.
 */

import type { Message } from '@/shared/chat'
import { ChatPersistenceLog } from '@/shared/data/constants/chat-persistence'

export interface ChatState {
  messages: Message[]
  isSending: boolean
  thinkingAgent: string | null
  streamingTokens: string
  lastUpdate: number
  threadId?: string
  episodeId?: string
}

export interface InterruptedStream {
  streamId: string
  threadId: string
  timestamp: number
  agent: string
  task: string
}

/**
 * Save chat state to session storage
 */
export function saveChatState(persistKey: string, state: Partial<ChatState>): void {
  try {
    const fullState: ChatState = {
      messages: state.messages || [],
      isSending: state.isSending || false,
      thinkingAgent: state.thinkingAgent || null,
      streamingTokens: state.streamingTokens || '',
      lastUpdate: Date.now(),
      threadId: state.threadId,
      episodeId: state.episodeId,
    }

    sessionStorage.setItem(`chat-state-${persistKey}`, JSON.stringify(fullState))
  } catch (error) {
    console.warn(ChatPersistenceLog.FailedSaveState, error)
  }
}

/**
 * Load chat state from session storage
 */
export function loadChatState(persistKey: string): ChatState | null {
  try {
    const saved = sessionStorage.getItem(`chat-state-${persistKey}`)
    if (!saved) return null

    const state: ChatState = JSON.parse(saved)

    // Only restore if recent (< 5 minutes old)
    const age = Date.now() - state.lastUpdate
    const maxAge = 5 * 60 * 1000 // 5 minutes

    if (age > maxAge) {
      console.log(ChatPersistenceLog.StateTooOld)
      clearChatState(persistKey)
      return null
    }

    return state
  } catch (error) {
    console.warn(ChatPersistenceLog.FailedLoadState, error)
    return null
  }
}

/**
 * Clear chat state
 */
export function clearChatState(persistKey: string): void {
  try {
    sessionStorage.removeItem(`chat-state-${persistKey}`)
    sessionStorage.removeItem(`stream-interrupted-${persistKey}`)
  } catch (error) {
    console.warn(ChatPersistenceLog.FailedClearState, error)
  }
}

/**
 * Save interrupted stream info
 */
export function saveInterruptedStream(persistKey: string, stream: InterruptedStream): void {
  try {
    sessionStorage.setItem(`stream-interrupted-${persistKey}`, JSON.stringify(stream))
  } catch (error) {
    console.warn(ChatPersistenceLog.FailedSaveInterruptedStream, error)
  }
}

/**
 * Load interrupted stream info
 */
export function loadInterruptedStream(persistKey: string): InterruptedStream | null {
  try {
    const saved = sessionStorage.getItem(`stream-interrupted-${persistKey}`)
    if (!saved) return null

    const stream: InterruptedStream = JSON.parse(saved)

    // Only restore if recent (< 10 minutes old)
    const age = Date.now() - stream.timestamp
    const maxAge = 10 * 60 * 1000 // 10 minutes

    if (age > maxAge) {
      console.log(ChatPersistenceLog.InterruptedStreamTooOld)
      clearInterruptedStream(persistKey)
      return null
    }

    return stream
  } catch (error) {
    console.warn(ChatPersistenceLog.FailedLoadInterruptedStream, error)
    return null
  }
}

/**
 * Clear interrupted stream info
 */
export function clearInterruptedStream(persistKey: string): void {
  try {
    sessionStorage.removeItem(`stream-interrupted-${persistKey}`)
  } catch (error) {
    console.warn(ChatPersistenceLog.FailedClearInterruptedStream, error)
  }
}
