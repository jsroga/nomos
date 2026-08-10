/**
 * Pull completed tool parts from the latest assistant UI message.
 * Domain-agnostic — callers filter by tool name.
 */

import { getToolName, isToolUIPart } from 'ai'
import type { UIMessage } from 'ai'
import { ChatMessageRole } from '@/shared/chat/core/constants/assistant-thread-ui'

enum ToolUiPartState {
  OutputAvailable = 'output-available',
}

export interface AssistantCompletedToolCall {
  toolName: string
  args: unknown
  result: unknown
}

export function extractCompletedAssistantToolCalls(
  messages: UIMessage[],
): AssistantCompletedToolCall[] {
  const calls: AssistantCompletedToolCall[] = []
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message?.role !== ChatMessageRole.Assistant) continue
    for (const part of message.parts) {
      if (!isToolUIPart(part)) continue
      if (part.state !== ToolUiPartState.OutputAvailable) continue
      calls.push({
        toolName: getToolName(part),
        args: part.input,
        result: part.output,
      })
    }
    break
  }
  return calls
}
