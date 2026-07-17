import {
  Message,
  AgentAction,
  AgentQuestion,
} from '../core/types'
import {
  CHAT_CONNECTION_ERROR_MESSAGE,
  CHAT_ERROR_DISPLAY_PREFIX,
  CHAT_QUOTA_EXCEEDED_MESSAGE,
  CHAT_RATE_LIMITED_MESSAGE,
  CHAT_UNKNOWN_ERROR,
} from '../core/constants/chat-messages'
import {
  ChatErrorCode,
  ErrorMessagePattern,
} from '../core/constants/chat-stream'
import { AgentStatusKind } from '../ui/constants/agent-status'
import type { AgentStatus } from '../ui/AgentLog'
import { asRecord, asString, StreamPayloadField } from './chat-stream-payload-helpers'

export function isStreamMessage(value: unknown): value is Message {
  if (typeof value !== 'object' || value === null) return false
  if (!(StreamPayloadField.Content in value)) return false
  return typeof value[StreamPayloadField.Content] === 'string'
}

export function isAgentAction(value: unknown): value is AgentAction {
  if (typeof value !== 'object' || value === null) return false
  return (
    StreamPayloadField.Type in value &&
    typeof value[StreamPayloadField.Type] === 'string'
  )
}

export function isAgentQuestion(value: unknown): value is AgentQuestion {
  if (typeof value !== 'object' || value === null) return false
  return StreamPayloadField.Id in value && typeof value[StreamPayloadField.Id] === 'string'
}

const AGENT_STATUS_VALUES = new Set<string>(Object.values(AgentStatusKind))

export function isAgentStatus(value: string): value is AgentStatus {
  return AGENT_STATUS_VALUES.has(value)
}

export function createActionId(): string {
  return `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function resolveStreamErrorMessage(data: Record<string, unknown>): string {
  const errorRecord = asRecord(data.error)
  return (
    asString(errorRecord?.message) ||
    asString(data.message) ||
    asString(data.error) ||
    CHAT_UNKNOWN_ERROR
  )
}

export function resolveStreamErrorCode(data: Record<string, unknown>): string {
  const errorRecord = asRecord(data.error)
  return asString(errorRecord?.code) || ChatErrorCode.Generic
}

export function resolveErrorDisplayMessage(errorMsg: string, errorCode: string): string {
  if (errorCode === ChatErrorCode.QuotaExceeded || errorMsg.includes(ErrorMessagePattern.Quota)) {
    return CHAT_QUOTA_EXCEEDED_MESSAGE
  }
  if (errorMsg.includes(ErrorMessagePattern.RateLimit)) {
    return CHAT_RATE_LIMITED_MESSAGE
  }
  if (
    errorMsg.includes(ErrorMessagePattern.Network) ||
    errorMsg.includes(ErrorMessagePattern.Timeout)
  ) {
    return CHAT_CONNECTION_ERROR_MESSAGE
  }
  return `${CHAT_ERROR_DISPLAY_PREFIX} ${errorMsg}`
}

export function isToolChainCorruption(errorMsg: string): boolean {
  return (
    errorMsg.includes(ErrorMessagePattern.Tool) && errorMsg.includes(ErrorMessagePattern.MustBe)
  )
}
