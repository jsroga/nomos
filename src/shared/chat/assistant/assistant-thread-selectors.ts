/**
 * Cached useThread selectors — avoid getSnapshot loops during streaming.
 */

import { ChatMessageRole, ChatPartType } from '../core/constants/assistant-thread-ui'

type ThreadMessageContent = ReadonlyArray<{ type: string; text?: string }>

type ThreadSnapshot = {
  messages: ReadonlyArray<{ role: string; content: ThreadMessageContent }>
  isRunning: boolean
}

function lastAssistantPlainText(messages: ThreadSnapshot['messages']): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (!message || message.role !== ChatMessageRole.Assistant) continue
    const chunks: string[] = []
    for (const part of message.content) {
      if (part.type !== ChatPartType.Text || typeof part.text !== 'string') continue
      if (part.text.trim()) chunks.push(part.text)
    }
    if (chunks.length > 0) return chunks.join('\n')
  }
  return ''
}

export function createThreadLastAssistantTextSelector(): (thread: ThreadSnapshot) => string {
  let lastMessages: ThreadSnapshot['messages'] | undefined
  let lastText = ''
  return thread => {
    const messages = thread.messages
    if (messages === lastMessages) return lastText
    lastMessages = messages
    const next = lastAssistantPlainText(messages)
    if (next === lastText) return lastText
    lastText = next
    return lastText
  }
}

export function createThreadIsEmptySelector(): (thread: ThreadSnapshot) => boolean {
  let lastCount = -1
  let lastResult = true
  return thread => {
    const count = thread.messages.length
    if (count === lastCount) return lastResult
    lastCount = count
    lastResult = count === 0
    return lastResult
  }
}

export function createThreadIsRunningSelector(): (thread: ThreadSnapshot) => boolean {
  let lastRunning: boolean | undefined
  return thread => {
    if (thread.isRunning === lastRunning) return lastRunning ?? false
    lastRunning = thread.isRunning
    return thread.isRunning
  }
}
