'use client'

import { ChevronDown, Loader2 } from 'lucide-react'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import { cn } from '@/shared/data/utils'
import {
  CHAT_CHROME_COPY,
  ChatChromeClass,
} from '@/shared/chat/core/utils/chat-chrome'
import { ChatChromeParagraphs } from './ChatChromeParagraphs'

export function ChatToolCard({
  title,
  message,
  open,
  debugText,
  busy = false,
  interactive = true,
  onToggle,
}: {
  title: string
  message?: string
  open: boolean
  debugText?: string
  busy?: boolean
  interactive?: boolean
  onToggle: () => void
}) {
  if (busy) {
    return (
      <div className={ChatChromeClass.ToolCard}>
        <div className={ChatChromeClass.ToolRunning} role="status" aria-label={CHAT_CHROME_COPY.Running}>
          <Loader2 className={ChatChromeClass.ToolSpinner} aria-hidden />
        </div>
      </div>
    )
  }

  const label = open ? CHAT_CHROME_COPY.HideTool : CHAT_CHROME_COPY.ShowTool
  const showBody = open && Boolean(message || debugText)
  const headClass = interactive ? ChatChromeClass.ToolHead : ChatChromeClass.ToolHeadStatic

  return (
    <div className={cn(ChatChromeClass.ToolCard, open ? ChatChromeClass.ToolCardOpen : undefined)}>
      {interactive ? (
        <button
          type={HtmlElementType.Button}
          className={headClass}
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
          <span className={ChatChromeClass.ToolTitle}>{title}</span>
        </button>
      ) : (
        <div className={headClass}>
          <span className={ChatChromeClass.ToolTitle}>{title}</span>
        </div>
      )}
      {showBody ? (
        <div className={ChatChromeClass.ToolBody}>
          {message ? (
            <ChatChromeParagraphs className={ChatChromeClass.Body} text={message} />
          ) : null}
          {debugText ? <pre className={ChatChromeClass.ToolDebug}>{debugText}</pre> : null}
        </div>
      ) : null}
    </div>
  )
}
