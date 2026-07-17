import {
  AgentAction,
  ActivityLogEntry,
  ApprovalActionStatus,
} from '../core/types'
import {
  ActivityLogEntryType,
  ChatMessageRole,
  ChatMessageSender,
  CHAT_PROPOSED_ACTION_LABEL,
  CHAT_THINKING_ENTRY_SEPARATOR,
} from '../core/constants/chat-messages'
import { USE_CHAT_STREAM_LOG_ACTION_RECEIVED } from './constants/use-chat-stream-log'
import { asRecord, asString } from './chat-stream-payload-helpers'
import type { ChatStreamFrameContext } from './chat-stream-frame-context'
import { createActionId, isAgentAction, isStreamMessage } from './chat-stream-frame-guards'

export function handleThinkingFrame(
  ctx: ChatStreamFrameContext,
  data: Record<string, unknown>
): void {
  if (!ctx.verboseUiRef.current) return

  const thinking = asString(data.thinking) || ''
  const agentName =
    asString(data.agent) || ctx.thinkingAgent || ChatMessageSender.Agent

  if (!thinking) return

  ctx.appendActivityLog({
    type: ActivityLogEntryType.Thinking,
    agent: agentName,
    content: thinking,
    timestamp: typeof data.timestamp === 'number' ? data.timestamp : Date.now(),
  })

  ctx.setMessages(prev => {
    const lastMsg = prev[prev.length - 1]
    if (!lastMsg || lastMsg.type !== ChatMessageRole.Ai) return prev

    const existingThinkingEntries = lastMsg.additional_kwargs?.thinkingEntries || []
    const newEntry = {
      agent: agentName,
      content: thinking,
      timestamp: typeof data.timestamp === 'number' ? data.timestamp : Date.now(),
    }
    const updatedEntries = [...existingThinkingEntries, newEntry]

    const formattedThinking = updatedEntries
      .map(entry => `[${entry.agent}]\n${entry.content}`)
      .join(CHAT_THINKING_ENTRY_SEPARATOR)

    return [
      ...prev.slice(0, -1),
      {
        ...lastMsg,
        thinking: formattedThinking,
        additional_kwargs: {
          ...lastMsg.additional_kwargs,
          thinking: formattedThinking,
          thinkingEntries: updatedEntries,
          hasThinking: true,
        },
      },
    ]
  })
}

export function handleMessageFrame(
  ctx: ChatStreamFrameContext,
  data: Record<string, unknown>
): void {
  const messageRecord = isStreamMessage(data.message) ? data.message : undefined

  const nodeAgent = asString(data.node) || asString(data.agent)
  ctx.setThinkingAgent(nodeAgent ?? null)

  ctx.setMessages(prev => {
    const exists = prev.some(
      existing =>
        existing?.sender === messageRecord?.sender &&
        existing?.content === messageRecord?.content &&
        existing?.type === messageRecord?.type &&
        messageRecord?.type !== ChatMessageRole.System
    )
    if (exists || !messageRecord) return prev

    const messageWithCitations = {
      ...messageRecord,
      citations: Array.isArray(data.citations) ? data.citations : messageRecord.citations,
    }

    const lastMsg = prev[prev.length - 1]
    if (
      lastMsg &&
      lastMsg.type === ChatMessageRole.Ai &&
      !lastMsg.content &&
      messageRecord.type === ChatMessageRole.Ai
    ) {
      return [
        ...prev.slice(0, -1),
        {
          ...lastMsg,
          ...messageWithCitations,
          activityLog: lastMsg.activityLog,
        },
      ]
    }

    return [...prev, messageWithCitations]
  })

  if (messageRecord?.type === ChatMessageRole.Ai) {
    ctx.localRoundCountRef.current++
    ctx.setRoundCount(ctx.localRoundCountRef.current)
  }
}

export function handleActionFrame(ctx: ChatStreamFrameContext, data: Record<string, unknown>): void {
  if (!isAgentAction(data.action)) return

  const action: AgentAction = {
    ...data.action,
    id: data.action.id ?? createActionId(),
  }

  const payloadRecord = asRecord(action.payload)
  console.log(
    USE_CHAT_STREAM_LOG_ACTION_RECEIVED,
    action.type,
    asString(payloadRecord?.label) || asString(payloadRecord?.id),
    `[ID: ${action.id}]`
  )

  const entry: ActivityLogEntry = {
    type: ActivityLogEntryType.Action,
    agent: ctx.thinkingAgent || asString(data.node) || asString(data.agent),
    content: action.reasoning || CHAT_PROPOSED_ACTION_LABEL,
    details: action,
    timestamp: Date.now(),
  }
  ctx.appendActivityLog(entry)

  const senderAgent =
    ctx.thinkingAgent || asString(data.node) || asString(data.agent)

  ctx.setMessages(prev => {
    const lastMsg = prev[prev.length - 1]
    if (
      lastMsg &&
      lastMsg.type === ChatMessageRole.Ai &&
      lastMsg.sender === senderAgent
    ) {
      const updatedActions = [
        ...(lastMsg.actions || []),
        { ...action, status: ApprovalActionStatus.PENDING },
      ]
      return [...prev.slice(0, -1), { ...lastMsg, actions: updatedActions }]
    }
    return [
      ...prev,
      {
        sender: senderAgent || ChatMessageSender.System,
        content: '',
        type: ChatMessageRole.Ai,
        actions: [{ ...action, status: ApprovalActionStatus.PENDING }],
      },
    ]
  })

  if (ctx.onAction) {
    const promise = ctx.onAction(action)
    if (ctx.pendingActionsRef) ctx.pendingActionsRef.current++
    promise.finally(() => {
      if (ctx.pendingActionsRef) ctx.pendingActionsRef.current--
    })
  }
}
