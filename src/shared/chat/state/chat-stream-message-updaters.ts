import { ChatMessageRole, ChatMessageSender } from '../core/constants/chat-messages'
import type { ActivityLogEntry, Message } from '../core/types'
import type { AgentStatus, AgentStatusInfo } from '../ui/AgentLog'
import { AgentStatusKind } from '../ui/constants/agent-status'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'

export function appendActivityLogEntry(
  verboseUiRef: MutableRefObject<boolean>,
  setMessages: (updater: Message[] | ((prev: Message[]) => Message[])) => void,
  entry: ActivityLogEntry
): void {
  if (!verboseUiRef.current) return
  setMessages(prev => {
    const lastAiMsgIndex = [...prev].reverse().findIndex(m => m && m.type === ChatMessageRole.Ai)
    const actualIndex = lastAiMsgIndex === -1 ? -1 : prev.length - 1 - lastAiMsgIndex

    if (actualIndex !== -1) {
      const updatedMessages = [...prev]
      const lastMsg = updatedMessages[actualIndex]
      const currentLog = lastMsg.activityLog || []
      updatedMessages[actualIndex] = {
        ...lastMsg,
        activityLog: [...currentLog, entry],
      }
      return updatedMessages
    }

    return [
      ...prev,
      {
        sender: ChatMessageSender.Storyteller,
        content: '',
        type: ChatMessageRole.Ai,
        activityLog: [entry],
      },
    ]
  })
}

export function updateActiveAgentStatus(
  verboseUiRef: MutableRefObject<boolean>,
  setActiveAgents: Dispatch<SetStateAction<AgentStatusInfo[]>>,
  agent: string,
  status: AgentStatus,
  message?: string,
  details?: string
): void {
  if (!verboseUiRef.current) return
  setActiveAgents(prev => {
    const existing = prev.find(a => a.agent === agent)

    if (
      status === AgentStatusKind.Complete ||
      status === AgentStatusKind.Error ||
      status === AgentStatusKind.Idle
    ) {
      return prev.filter(a => a.agent !== agent)
    }

    if (existing) {
      return prev.map(a => (a.agent === agent ? { ...a, status, message, details } : a))
    }

    return [
      ...prev,
      {
        agent,
        status,
        message,
        details,
        startTime: Date.now(),
      },
    ]
  })
}
