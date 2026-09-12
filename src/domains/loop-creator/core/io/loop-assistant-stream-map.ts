import type { StreamEvent } from '@/domains/loop-creator/core/graph/stream-event'
import {
  LoopOrchestratorEventType,
  LoopOrchestratorNodeStatus,
} from '@/domains/loop-creator/constants/loop-orchestrator'
import { AssistantReasoningPrefix } from '@/shared/chat/core/utils/assistant-thread-ui'

export enum LoopAssistantActionPrefix {
  Action = '  ↳ ',
}

const TEXT_SEPARATOR = '\n\n'
const LINE_END = '\n'

export function mapLoopStreamEventToReasoningDelta(event: StreamEvent): string | null {
  if (event.type === LoopOrchestratorEventType.Log && event.content) {
    return `${event.content}${LINE_END}`
  }
  if (
    event.type === LoopOrchestratorEventType.Node &&
    event.status === LoopOrchestratorNodeStatus.Working
  ) {
    const line = event.content ?? event.agent ?? event.node
    if (!line) return null
    return `${AssistantReasoningPrefix.Activity}${line}${LINE_END}`
  }
  if (event.type === LoopOrchestratorEventType.Action && event.action?.type) {
    return `${LoopAssistantActionPrefix.Action}${event.action.type}${LINE_END}`
  }
  return null
}

export function mapLoopStreamEventToTextDelta(event: StreamEvent): string | null {
  if (event.type === LoopOrchestratorEventType.Message && event.message?.content) {
    return `${event.message.content}${TEXT_SEPARATOR}`
  }
  return null
}
