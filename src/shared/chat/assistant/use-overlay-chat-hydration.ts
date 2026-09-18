'use client'

import { useEffect, useState, type MutableRefObject } from 'react'
import type { UIMessage } from 'ai'
import { fetchChatSessionMessages } from '@/shared/chat/core/io/chat-sessions.api'
import {
  mastraMemoryToUiMessages,
  shouldHydrateOverlayMessages,
} from '@/shared/chat/core/io/mastra-memory-to-ui-messages'
import { useWorkspaceChatUiStore } from '@/shared/chat/state/workspace-chat-ui-store'

export function useOverlayChatHydration(input: {
  overlaySessionId: string | undefined
  setMessages: (messages: UIMessage[]) => void
  messagesRef: MutableRefObject<UIMessage[]>
}): boolean {
  const { overlaySessionId, setMessages, messagesRef } = input
  const draftSession = useWorkspaceChatUiStore(state => state.draftSession)
  const [hydrating, setHydrating] = useState(
    Boolean(overlaySessionId) && !(draftSession && overlaySessionId === draftSession.id),
  )

  useEffect(() => {
    if (!overlaySessionId || (draftSession && overlaySessionId === draftSession.id)) {
      setHydrating(false)
      return
    }
    let cancelled = false
    setHydrating(true)
    void (async () => {
      try {
        const raw = await fetchChatSessionMessages(overlaySessionId)
        if (cancelled) return
        const incoming = mastraMemoryToUiMessages(raw)
        if (!shouldHydrateOverlayMessages(messagesRef.current.length, incoming.length)) return
        setMessages(incoming)
      } finally {
        if (!cancelled) setHydrating(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [overlaySessionId, setMessages, messagesRef, draftSession])

  return hydrating
}
