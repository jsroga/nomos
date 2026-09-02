/**
 * Cached useMessage selectors — avoid getSnapshot loops during streaming.
 */

import { ChatMessageStatus, ChatPartType } from '../core/constants/assistant-thread-ui'

const REASONING_PART_TYPE = 'reasoning'

function hasRenderableAssistantContent(
  content: ReadonlyArray<{ type: string; text?: string }>,
): boolean {
  return content.some(part => {
    if (part.type === REASONING_PART_TYPE) return false
    if (part.type === ChatPartType.Text) {
      return typeof part.text === 'string' && part.text.trim().length > 0
    }
    return true
  })
}

function assistantPlainTextFromContent(
  content: ReadonlyArray<{ type: string; text?: string }>,
): string {
  return content
    .filter(part => part.type === ChatPartType.Text && typeof part.text === 'string')
    .map(part => part.text ?? '')
    .join('\n')
    .trim()
}

export function createAssistantPlainTextSelector(): (
  content: ReadonlyArray<{ type: string; text?: string }>,
) => string {
  let lastContent: ReadonlyArray<{ type: string; text?: string }> | undefined
  let lastText = ''
  return content => {
    if (content === lastContent) return lastText
    const next = assistantPlainTextFromContent(content)
    lastContent = content
    if (next === lastText) return lastText
    lastText = next
    return lastText
  }
}

type ShowThinkingMessage = {
  status?: { type?: string } | null
  content: ReadonlyArray<{ type: string; text?: string }>
}

export function createShowThinkingSelector(): (message: ShowThinkingMessage) => boolean {
  let lastContent: ReadonlyArray<{ type: string; text?: string }> | undefined
  let lastStatusType: string | undefined
  let lastResult = false
  return message => {
    const statusType = message.status?.type
    const content = message.content
    if (content === lastContent && statusType === lastStatusType) return lastResult
    lastContent = content
    lastStatusType = statusType
    lastResult =
      statusType === ChatMessageStatus.Running && !hasRenderableAssistantContent(content)
    return lastResult
  }
}
