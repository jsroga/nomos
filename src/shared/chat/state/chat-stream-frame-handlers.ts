import {
  ActivityLogEntry,
} from '../core/types'
import { ChatFrameType } from '../core/protocol'
import {
  ActivityLogEntryType,
  ChatMessageRole,
  ChatMessageSender,
  CHAT_AGENT_PROCESSING_STATUS,
  CHAT_SESSION_CORRUPTED_MESSAGE,
  QuestionSessionStatus,
  QuestionUrgency,
} from '../core/constants/chat-messages'
import {
  CHAT_DEBUG_ENABLED,
  CHAT_MESSAGES_STORAGE_PREFIX,
  ChatStreamMode,
  SECTION_FRAME_PREFIX,
} from '../core/constants/chat-stream'
import { AgentStatusKind } from '../ui/constants/agent-status'
import {
  USE_CHAT_STREAM_LOG_ERROR_RECEIVED,
  USE_CHAT_STREAM_LOG_INFO,
  USE_CHAT_STREAM_LOG_NAVIGATION,
  USE_CHAT_STREAM_LOG_SECTION_LOADING,
  USE_CHAT_STREAM_LOG_STREAM_START,
  USE_CHAT_STREAM_LOG_TOOL_CHAIN_ERROR,
} from './constants/use-chat-stream-log'
import { asString, frameType } from './chat-stream-payload-helpers'
import type { ChatStreamFrameContext } from './chat-stream-frame-context'
import {
  handleActionFrame,
  handleMessageFrame,
  handleThinkingFrame,
} from './chat-stream-content-frame-handlers'
import {
  isAgentQuestion,
  isAgentStatus,
  isToolChainCorruption,
  resolveErrorDisplayMessage,
  resolveStreamErrorCode,
  resolveStreamErrorMessage,
} from './chat-stream-frame-guards'

const CHAT_DEBUG = process.env.NEXT_PUBLIC_CHAT_DEBUG === CHAT_DEBUG_ENABLED

export function cleanupStreamState(ctx: ChatStreamFrameContext): void {
  ctx.setThinkingAgent(null)
  ctx.setIsTokenStreaming(false)
  ctx.setStreamingTokens('')
  ctx.streamingTokensRef.current = ''
  ctx.cancelTokenFlush()
  ctx.setStreamingSections([])
  ctx.setIsSending(false)
  ctx.setActiveAgents([])
  ctx.setIsAwaitingInput(false)
  ctx.onComplete?.()
}

export function handleStartFrame(ctx: ChatStreamFrameContext, data: Record<string, unknown>): void {
  ctx.setThinkingAgent(ChatMessageSender.Processing)
  ctx.setStreamingTokens('')
  ctx.streamingTokensRef.current = ''
  ctx.setStreamingSections([])
  ctx.setIsTokenStreaming(ctx.verboseUiRef.current && data.streamMode === ChatStreamMode.Events)
  ctx.setCitations([])
  ctx.setGroundingScore(null)

  ctx.setMessages(prev => {
    const lastMsg = prev[prev.length - 1]

    if (CHAT_DEBUG) console.log(USE_CHAT_STREAM_LOG_STREAM_START, lastMsg?.sender)

    if (
      lastMsg &&
      lastMsg.type === ChatMessageRole.Ai &&
      !lastMsg.content &&
      !lastMsg.activityLog
    ) {
      return prev
    }
    return [
      ...prev,
      {
        sender: ChatMessageSender.Storyteller,
        content: '',
        type: ChatMessageRole.Ai,
        activityLog: [],
      },
    ]
  })
}

export function handleTokenFrame(ctx: ChatStreamFrameContext, data: Record<string, unknown>): void {
  ctx.streamingTokensRef.current += asString(data.token) || ''
  ctx.scheduleTokenFlush()
}

export function handleNodeFrame(ctx: ChatStreamFrameContext, data: Record<string, unknown>): void {
  const agentName = asString(data.node) || asString(data.agent)
  if (!agentName) return
  ctx.setThinkingAgent(agentName)
  ctx.updateAgentStatus(agentName, AgentStatusKind.Thinking, CHAT_AGENT_PROCESSING_STATUS)
}

export function handleNodeCompleteFrame(
  ctx: ChatStreamFrameContext,
  data: Record<string, unknown>
): void {
  const agentName = asString(data.node) || asString(data.agent)
  if (!agentName) return
  ctx.updateAgentStatus(agentName, AgentStatusKind.Complete)
  ctx.setStreamingTokens('')
}

export function handleAgentStatusFrame(
  ctx: ChatStreamFrameContext,
  data: Record<string, unknown>
): void {
  const agent = asString(data.agent)
  const status = asString(data.status)
  if (!agent || !status || !isAgentStatus(status)) return

  ctx.updateAgentStatus(agent, status, asString(data.message), asString(data.details))

  const entry: ActivityLogEntry = {
    type: ActivityLogEntryType.Status,
    agent,
    content: asString(data.message),
    timestamp: Date.now(),
    details: data.details,
  }
  ctx.appendActivityLog(entry)
}

export function handleToolFrame(ctx: ChatStreamFrameContext, data: Record<string, unknown>): void {
  const entry: ActivityLogEntry = {
    type: ActivityLogEntryType.Tool,
    toolName: asString(data.toolName) || asString(data.tool),
    toolInput: data.args ?? data.input,
    toolResult: data.result,
    timestamp: Date.now(),
  }
  ctx.appendActivityLog(entry)
}

export { handleThinkingFrame, handleMessageFrame, handleActionFrame }

export function handleQuestionsFrame(
  ctx: ChatStreamFrameContext,
  data: Record<string, unknown>
): void {
  if (!ctx.onQuestion || !Array.isArray(data.questions) || data.questions.length === 0) return

  const questions = data.questions.filter(isAgentQuestion)
  questions.forEach(q => {
    ctx.onQuestion?.({
      id: q.id,
      question: q,
      status: QuestionSessionStatus.Pending,
      workflowRunId: asString(data.workflowRunId),
      workflowStepId: asString(data.workflowStepId),
    })
  })

  if (questions.some(q => q.urgency === QuestionUrgency.Blocking)) {
    ctx.setIsAwaitingInput(true)
  }
}

export function handleAwaitingInputFrame(ctx: ChatStreamFrameContext): void {
  ctx.setIsAwaitingInput(true)
  ctx.setThinkingAgent(null)
  ctx.setIsTokenStreaming(false)
  ctx.setStreamingTokens('')
}

export function handleInfoFrame(ctx: ChatStreamFrameContext, data: Record<string, unknown>): void {
  console.log(USE_CHAT_STREAM_LOG_INFO, data.message)
  ctx.onStreamingUpdate?.(data)
}

export function handleNavigationFrame(
  ctx: ChatStreamFrameContext,
  data: Record<string, unknown>
): void {
  console.log(USE_CHAT_STREAM_LOG_NAVIGATION, data.action, data.episodeId)
  ctx.onStreamingUpdate?.(data)
}

export function handleStateFrame(ctx: ChatStreamFrameContext, data: Record<string, unknown>): void {
  ctx.onStreamingUpdate?.(data)
}

export function handleSectionLoadingFrame(
  ctx: ChatStreamFrameContext,
  data: Record<string, unknown>
): void {
  const section = asString(data.section)
  if (!section) return

  const loading = Boolean(data.loading)
  const message = asString(data.message)

  if (CHAT_DEBUG) console.log(`${USE_CHAT_STREAM_LOG_SECTION_LOADING} ${section} = ${loading}`)

  ctx.setLoadingSections(prev => ({
    ...prev,
    [section]: { loading, message },
  }))

  ctx.onSectionLoading?.(section, loading, message)
}

export function handleCompleteFrame(ctx: ChatStreamFrameContext): void {
  cleanupStreamState(ctx)
}

export function handleErrorFrame(ctx: ChatStreamFrameContext, data: Record<string, unknown>): void {
  const errorMsg = resolveStreamErrorMessage(data)
  const errorCode = resolveStreamErrorCode(data)

  console.error(`${USE_CHAT_STREAM_LOG_ERROR_RECEIVED} ${errorCode} - ${errorMsg}`)

  if (isToolChainCorruption(errorMsg)) {
    console.warn(USE_CHAT_STREAM_LOG_TOOL_CHAIN_ERROR)
    if (ctx.persistKey && typeof window !== 'undefined') {
      sessionStorage.removeItem(`${CHAT_MESSAGES_STORAGE_PREFIX}${ctx.persistKey}`)
    }
    ctx.setMessages(prev => [
      ...prev,
      {
        sender: ChatMessageSender.System,
        content: CHAT_SESSION_CORRUPTED_MESSAGE,
        type: ChatMessageRole.Ai,
      },
    ])
  } else {
    const displayMessage = resolveErrorDisplayMessage(errorMsg, errorCode)
    ctx.setMessages(prev => [
      ...prev,
      {
        sender: ChatMessageSender.System,
        content: displayMessage,
        type: ChatMessageRole.System,
      },
    ])
  }

  cleanupStreamState(ctx)
}

function isCitationFrame(eventType: string): boolean {
  return (
    eventType === ChatFrameType.Citation ||
    eventType === ChatFrameType.Citations ||
    eventType === ChatFrameType.Grounding
  )
}

type FrameHandler = (ctx: ChatStreamFrameContext, data: Record<string, unknown>) => void

function resolveFrameHandler(eventType: string): FrameHandler | undefined {
  const directHandlers: Record<string, FrameHandler> = {
    [ChatFrameType.Start]: handleStartFrame,
    [ChatFrameType.Token]: handleTokenFrame,
    [ChatFrameType.Node]: handleNodeFrame,
    [ChatFrameType.NodeStart]: handleNodeFrame,
    [ChatFrameType.NodeComplete]: handleNodeCompleteFrame,
    [ChatFrameType.AgentStatus]: handleAgentStatusFrame,
    [ChatFrameType.ToolResult]: handleToolFrame,
    [ChatFrameType.ToolCall]: handleToolFrame,
    [ChatFrameType.Thinking]: handleThinkingFrame,
    [ChatFrameType.Message]: handleMessageFrame,
    [ChatFrameType.Action]: handleActionFrame,
    [ChatFrameType.Questions]: handleQuestionsFrame,
    [ChatFrameType.AwaitingInput]: (_ctx) => handleAwaitingInputFrame(_ctx),
    [ChatFrameType.Info]: handleInfoFrame,
    [ChatFrameType.Navigation]: handleNavigationFrame,
    [ChatFrameType.State]: handleStateFrame,
    [ChatFrameType.SectionLoading]: handleSectionLoadingFrame,
    [ChatFrameType.Complete]: (_ctx) => handleCompleteFrame(_ctx),
    [ChatFrameType.Done]: (_ctx) => handleCompleteFrame(_ctx),
    [ChatFrameType.Terminated]: (_ctx) => handleCompleteFrame(_ctx),
    [ChatFrameType.Error]: handleErrorFrame,
  }

  if (eventType in directHandlers) {
    return directHandlers[eventType]
  }
  if (eventType.startsWith(SECTION_FRAME_PREFIX)) {
    return (ctx, data) => ctx.processSectionEvent(data)
  }
  if (isCitationFrame(eventType)) {
    return (ctx, data) => ctx.processCitationEvent(data)
  }
  return undefined
}

/**
 * Dispatch a single parsed SSE frame to the appropriate handler.
 * Preserves the wire-protocol event type routing from useChatStream.
 */
export function processChatStreamFrame(
  ctx: ChatStreamFrameContext,
  data: Record<string, unknown>
): void {
  ctx.onStreamingUpdate?.(data)

  const eventType = frameType(data)
  if (!eventType) return

  const handler = resolveFrameHandler(eventType)
  handler?.(ctx, data)
}
