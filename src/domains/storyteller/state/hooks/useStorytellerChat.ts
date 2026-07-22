'use client'

/**
 * Storyteller chat state — legacy-chat removal.
 *
 * The storyteller workspace now chats through the assistant-ui Writers Room
 * (`AssistantChat` → the Mastra `storyteller` agent), which drives the world
 * bible / beats via its own server-side tools. The old `useChatStream` engine
 * that this hook wrapped has been deleted; what remains is the minimal state the
 * surrounding page hooks/panels still read (message list, sending flags, section
 * loading). The programmatic send / stream entry points are inert stubs — the
 * agentic side-effects they used to drive (action approval, questions, phase
 * progression) are being re-homed on the assistant-ui tool path.
 */

import { useCallback, useRef, useState } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction, FormEvent } from 'react'
import type { Message } from '@/shared/chat/core/types'

type LoadingSections = Record<string, { loading: boolean; message?: string }>

export interface StorytellerChatSlice {
  messages: Message[]
  setMessages: Dispatch<SetStateAction<Message[]>>
  isSending: boolean
  setIsSending: Dispatch<SetStateAction<boolean>>
  setIsAwaitingInput: Dispatch<SetStateAction<boolean>>
  handleSendMessage: (e?: FormEvent, msgOverride?: string, section?: string) => Promise<void>
  loadingSections: LoadingSections
  processStream: (
    res: Response,
    signal: AbortSignal,
    initialRoundCount?: number,
    pendingActionsRef?: MutableRefObject<number>
  ) => Promise<void>
  roundCount: number
  abortControllerRef: MutableRefObject<AbortController | null>
}

export function useStorytellerChat(): StorytellerChatSlice {
  const [messages, setMessages] = useState<Message[]>([])
  const [isSending, setIsSending] = useState(false)
  const [, setIsAwaitingInput] = useState(false)
  const [loadingSections] = useState<LoadingSections>({})
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleSendMessage = useCallback(async () => {
    // Inert: sending now happens through the assistant-ui Writers Room.
  }, [])

  const processStream = useCallback(async () => {
    // Inert: no legacy stream to process.
  }, [])

  return {
    messages,
    setMessages,
    isSending,
    setIsSending,
    setIsAwaitingInput,
    handleSendMessage,
    loadingSections,
    processStream,
    roundCount: 0,
    abortControllerRef,
  }
}
