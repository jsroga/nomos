'use client'

import { ChevronDown } from 'lucide-react'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import { cn } from '@/shared/data/utils'
import {
  CHAT_CHROME_COPY,
  ChatChromeClass,
} from '@/shared/chat/core/utils/chat-chrome'
import { ChatChromeParagraphs } from './ChatChromeParagraphs'

export function ChatThought({
  durationLabel,
  text,
  open,
  live = false,
  onToggle,
}: {
  durationLabel: string
  text: string
  open: boolean
  live?: boolean
  onToggle: () => void
}) {
  const body = text.trim()
  if (!body) return null
  const label = open ? CHAT_CHROME_COPY.HideThought : CHAT_CHROME_COPY.ShowThought

  return (
    <div className={cn(ChatChromeClass.Thought, live ? ChatChromeClass.ThoughtLive : undefined)}>
      <button
        type={HtmlElementType.Button}
        className={ChatChromeClass.ThoughtToggle}
        aria-expanded={open}
        aria-label={label}
        onClick={onToggle}
      >
        <ChevronDown
          className={cn(
            ChatChromeClass.ThoughtChevron,
            open ? ChatChromeClass.ThoughtChevronOpen : undefined,
          )}
          aria-hidden
        />
        {durationLabel}
      </button>
      {open ? <ChatChromeParagraphs className={ChatChromeClass.ThoughtBody} text={body} /> : null}
    </div>
  )
}
