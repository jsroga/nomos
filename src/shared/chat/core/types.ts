import { ReactNode } from 'react'
import {
  ApprovalActionStatus,
  WireAgentAction,
  type ActionMessageLocation,
} from '@/shared/agent-kernel/action-wire'
import {
  DEFAULT_THINKING_MESSAGES,
  getThinkingMessage,
  type ThinkingMessageStep,
  type ThinkingMessagesConfig,
} from './constants/thinking-messages'

export type { ActionMessageLocation }
export type ActionStatus = ApprovalActionStatus
export { ApprovalActionStatus }
export type AgentAction = WireAgentAction
export {
  DEFAULT_THINKING_MESSAGES,
  getThinkingMessage,
  type ThinkingMessageStep,
  type ThinkingMessagesConfig,
}

// Thinking entry with agent attribution
export interface ThinkingEntry {
  agent: string
  content: string
  timestamp: number
}

// Activity Log Entry for persisting technical events
export interface ActivityLogEntry {
  type: 'status' | 'thinking' | 'tool' | 'action' | 'error' | 'start' | 'complete'
  agent?: string
  content?: string
  toolName?: string
  toolInput?: unknown
  toolResult?: unknown
  timestamp: number
  details?: unknown
}

// Message types
export interface Message {
  sender?: string
  name?: string
  content: string
  type?: 'human' | 'ai' | 'system' | 'consistency_check'
  actions?: AgentAction[]
  questions?: AgentQuestion[]
  thinking?: string
  confidence?: number
  id?: string
  timestamp?: Date
  /**
   * Domain-specific consistency payload — the platform treats it as opaque;
   * the owning domain narrows it in its injected `renderConsistency`
   * (see core/renderers.tsx). Tenant semantics over platform frames (D7).
   */
  consistencyResult?: unknown
  /** Detailed activity log for playback/inspection */
  activityLog?: ActivityLogEntry[]
  /** Additional metadata for extended functionality */
  additional_kwargs?: {
    thinking?: string
    thinkingEntries?: ThinkingEntry[]
    hasThinking?: boolean
    citations?: unknown[]
    [key: string]: unknown
  }
  /** Array of citations if grounded in sources */
  citations?: unknown[]
}

// Agent Configuration
export interface AgentConfig {
  color: string
  bgColor?: string // Optional for minimalist designs
  icon: ReactNode
}

export type AgentConfigMap = Record<string, AgentConfig>

// Action status for approval flow — re-exported from shared wire types (see top of file)

export interface AgentQuestion {
  id: string
  question: string
  options?: string[]
  urgency?: 'blocking' | 'normal'
  context?: string
}

// Stream Event Types
export type StreamEventType =
  | 'start'
  | 'token'
  | 'section_start'
  | 'section_complete'
  | 'node_start'
  | 'node_complete'
  | 'message'
  | 'action'
  | 'questions'
  | 'consistency_check'
  | 'awaiting_input'
  | 'done'
  | 'terminated'
  | 'error'

export interface StreamEvent {
  type: StreamEventType
  [key: string]: unknown
}

export interface QuestionSession {
  id: string
  question: AgentQuestion
  status: 'pending' | 'answered' | 'skipped'
  answer?: string | string[]
  /** Workflow run ID for resuming suspended workflows */
  workflowRunId?: string
  /** Workflow step ID for resuming at the correct step */
  workflowStepId?: string
}
