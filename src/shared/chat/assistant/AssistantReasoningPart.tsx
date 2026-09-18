'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReasoningMessagePartComponent } from '@assistant-ui/react'
import { ChatThought } from '@/shared/chat/ui/ChatChrome'
import {
  CHAT_CHROME_COPY,
  CHAT_CHROME_MS_PER_SECOND,
  formatThoughtDurationLabel,
} from '@/shared/chat/core/utils/chat-chrome'
import { ChatMessageStatus } from '@/shared/chat/core/utils/assistant-thread-ui'

export const AssistantReasoningPart: ReasoningMessagePartComponent = ({ text, status }) => {
  const streaming = status?.type === ChatMessageStatus.Running
  const startedAt = useRef(Date.now())
  const [elapsedMs, setElapsedMs] = useState(0)
  const [open, setOpen] = useState(true)
  const body = text.trim()

  useEffect(() => {
    if (!streaming) return
    const timer = setInterval(() => setElapsedMs(Date.now() - startedAt.current), CHAT_CHROME_MS_PER_SECOND)
    return () => clearInterval(timer)
  }, [streaming])

  if (!body) return null
  const durationLabel =
    streaming || elapsedMs > 0 ? formatThoughtDurationLabel(elapsedMs) : CHAT_CHROME_COPY.Thought

  return (
    <ChatThought
      durationLabel={durationLabel}
      text={body}
      open={open}
      live={streaming}
      onToggle={() => setOpen(value => !value)}
    />
  )
}
