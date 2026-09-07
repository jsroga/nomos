'use client'

import { useEffect, type MutableRefObject } from 'react'
import type { UIMessage } from 'ai'
import { fetchChatSessionMessages } from '@/shared/chat/core/io/chat-sessions.api'
import {
  mastraMemoryToUiMessages,
  shouldHydrateOverlayMessages,
} from '@/shared/chat/core/io/mastra-memory-to-ui-messages'

export function useOverlayChatHydration(input: {
  overlaySessionId: string | undefined
  setMessages: (messages: UIMessage[]) => void
  messagesRef: MutableRefObject<UIMessage[]>
}): void {
  const { overlaySessionId, setMessages, messagesRef } = input

  useEffect(() => {
    if (!overlaySessionId) return
    let cancelled = false
    void (async () => {
      const raw = await fetchChatSessionMessages(overlaySessionId)
      if (cancelled) return
      const incoming = mastraMemoryToUiMessages(raw)
      if (!shouldHydrateOverlayMessages(messagesRef.current.length, incoming.length)) return
      setMessages(incoming)
    })()
    return () => {
      cancelled = true
    }
  }, [overlaySessionId, setMessages, messagesRef])
}
