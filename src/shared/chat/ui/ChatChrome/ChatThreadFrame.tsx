import type { ReactNode } from 'react'
import { ChatChromeClass } from '@/shared/chat/core/utils/chat-chrome'
import { ChatChromeParagraphs } from './ChatChromeParagraphs'
import './chat-chrome.css'

export function ChatThreadFrame({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className={ChatChromeClass.Story}>
      <div className={ChatChromeClass.Thread}>{children}</div>
    </div>
  )
}

export function ChatAssistantColumn({ children }: { children: ReactNode }) {
  return <div className={ChatChromeClass.Assistant}>{children}</div>
}

export function ChatChromeStack({ children }: { children: ReactNode }) {
  return <div className={ChatChromeClass.Stack}>{children}</div>
}

export function ChatAssistantBody({ text }: { text: string }) {
  if (!text.trim()) return null
  return <ChatChromeParagraphs className={ChatChromeClass.Body} text={text} />
}

export function ChatChromeStatus({ children }: { children: string }) {
  if (!children.trim()) return null
  return <p className={ChatChromeClass.Status}>{children}</p>
}
