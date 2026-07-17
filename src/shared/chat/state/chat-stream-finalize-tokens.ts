import { ChatMessageRole, ChatMessageSender } from '../core/constants/chat-messages'
import {
  STREAM_JSON_ESCAPE_NEWLINE,
  STREAM_JSON_ESCAPE_QUOTE,
  STREAM_JSON_MESSAGE_REGEX,
} from '../core/constants/chat-stream'
import type { Message, AgentAction } from '../core/types'
import type { ChatStreamFrameContext } from './chat-stream-frame-context'
import { cleanupStreamState } from './chat-stream-frame-handlers'

interface FinalizeStreamTokensParams {
  signal: AbortSignal
  ctx: ChatStreamFrameContext
  thinkingAgent: string | null
  onAction?: (action: AgentAction) => Promise<void>
  setMessages: (updater: Message[] | ((prev: Message[]) => Message[])) => void
}

function extractNarrativeFromTokens(text: string): { content: string; shouldFlush: boolean } {
  if (!text.startsWith('{')) {
    return { content: text, shouldFlush: true }
  }

  const messageMatch = text.match(STREAM_JSON_MESSAGE_REGEX)
  if (!messageMatch) {
    return { content: text, shouldFlush: false }
  }

  const content = messageMatch[1]
    .replace(STREAM_JSON_ESCAPE_QUOTE, '"')
    .replace(STREAM_JSON_ESCAPE_NEWLINE, '\n')

  return { content, shouldFlush: true }
}

export function finalizeChatStreamTokens(params: FinalizeStreamTokensParams): void {
  const { signal, ctx, thinkingAgent, onAction, setMessages } = params

  if (!signal.aborted && ctx.streamingTokensRef.current) {
    try {
      const potentialJson = ctx.streamingTokensRef.current.trim()
      if (potentialJson.startsWith('{') && potentialJson.endsWith('}')) {
        const data = JSON.parse(potentialJson)
        if (data.type && onAction) {
          onAction(data)
        }
      }
    } catch {
      // Not JSON
    }

    const text = ctx.streamingTokensRef.current.trim()
    if (text) {
      const { content: finalContent, shouldFlush } = extractNarrativeFromTokens(text)

      if (shouldFlush) {
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1]
          if (lastMsg && lastMsg.content === finalContent) return prev

          return [
            ...prev,
            {
              sender: thinkingAgent || ChatMessageSender.Agent,
              content: finalContent,
              type: ChatMessageRole.Ai,
            },
          ]
        })
      }
    }
  }

  cleanupStreamState(ctx)
}
