import type { MutableRefObject } from 'react'
import { SSE_DATA_PREFIX } from '../core/constants/chat-stream'
import { USE_CHAT_STREAM_LOG_STREAM_ERROR } from './constants/use-chat-stream-log'
import type { ChatStreamFrameContext } from './chat-stream-frame-context'
import { processChatStreamFrame } from './chat-stream-frame-handlers'
import { finalizeChatStreamTokens } from './chat-stream-finalize-tokens'
import type { AgentAction } from '../core/types'
import type { Message } from '../core/types'

interface ProcessChatStreamParams {
  res: Response
  signal: AbortSignal
  initialRoundCount?: number
  pendingActionsRef?: MutableRefObject<number>
  ctx: ChatStreamFrameContext
  thinkingAgent: string | null
  onAction?: (action: AgentAction) => Promise<void>
  setMessages: (updater: Message[] | ((prev: Message[]) => Message[])) => void
}

export async function processChatStreamResponse(params: ProcessChatStreamParams): Promise<void> {
  const {
    res,
    signal,
    initialRoundCount = 0,
    ctx,
    thinkingAgent,
    onAction,
    setMessages,
  } = params

  const reader = res.body?.getReader()
  const decoder = new TextDecoder()
  ctx.localRoundCountRef.current = initialRoundCount

  if (!reader) return

  ctx.setCitations([])
  ctx.setGroundingScore(null)

  try {
    while (true) {
      if (signal.aborted) {
        reader.cancel()
        break
      }

      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (!line.startsWith(SSE_DATA_PREFIX)) continue

        try {
          const data = JSON.parse(line.slice(SSE_DATA_PREFIX.length))
          if (typeof data === 'object' && data !== null) {
            processChatStreamFrame(ctx, data)
          }
        } catch {
          // ignore parse error
        }
      }
    }
  } catch (error: unknown) {
    console.error(USE_CHAT_STREAM_LOG_STREAM_ERROR, error)
  } finally {
    finalizeChatStreamTokens({
      signal,
      ctx,
      thinkingAgent,
      onAction,
      setMessages,
    })
  }
}
