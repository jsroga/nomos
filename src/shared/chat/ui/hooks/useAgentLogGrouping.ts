import { useMemo } from 'react'
import type { Message } from '../../core/types'
import { ChatMessageRole } from '../../core/constants/chat-messages'
import { AgentWireId } from '../constants/agent-log'

export function useCurrentAgent(
  isSending: boolean,
  thinkingAgent: string | null | undefined,
  activeAgents: Array<{ agent: string }>,
  messages: Message[]
): string | null {
  return useMemo(() => {
    if (!isSending) return null

    if (thinkingAgent && thinkingAgent !== AgentWireId.RunnableSequence) {
      return thinkingAgent
    }

    if (activeAgents.length > 0) {
      return activeAgents[activeAgents.length - 1]?.agent || null
    }

    for (let idx = messages.length - 1; idx >= 0; idx--) {
      const msg = messages[idx]
      if (msg.type === ChatMessageRole.Ai && msg.sender) {
        return msg.sender
      }
    }
    return null
  }, [isSending, thinkingAgent, activeAgents, messages])
}
