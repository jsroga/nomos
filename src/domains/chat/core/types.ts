import { ReactNode } from 'react'
import { ConsistencyCheckResult } from '@/domains/storyteller'
import {
  ApprovalActionStatus,
  WireAgentAction,
  type ActionMessageLocation,
} from '@/shared/agent-kernel/action-wire'

export type { ActionMessageLocation }
export type ActionStatus = ApprovalActionStatus
export { ApprovalActionStatus }
export type AgentAction = WireAgentAction

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
  toolInput?: any
  toolResult?: any
  timestamp: number
  details?: any
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
  consistencyResult?: ConsistencyCheckResult
  /** Detailed activity log for playback/inspection */
  activityLog?: ActivityLogEntry[]
  /** Additional metadata for extended functionality */
  additional_kwargs?: {
    thinking?: string
    thinkingEntries?: ThinkingEntry[]
    hasThinking?: boolean
    citations?: any[]
    [key: string]: any
  }
  /** Array of citations if grounded in sources */
  citations?: any[]
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

interface StreamEvent {
  type: StreamEventType
  [key: string]: any
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

// ============================================
// Thinking Messages Configuration
// ============================================

/** A single threshold-based thinking message */
export interface ThinkingMessageStep {
  /** Minimum seconds for this message to show */
  minSeconds: number
  /** Message to display */
  message: string
}

/** Configuration for thinking messages (with agent and without) */
export interface ThinkingMessagesConfig {
  /** Ordered list of messages when an agent is identified */
  withAgent: ThinkingMessageStep[]
  /** Ordered list of messages when no agent is identified (fallback) */
  fallback: ThinkingMessageStep[]
  /** Message shown when processing is complete */
  completeMessage: string
}

/** Default thinking messages - can be overridden per-module */
export const DEFAULT_THINKING_MESSAGES: ThinkingMessagesConfig = {
  withAgent: [
    { minSeconds: 0, message: 'Analyzing your request...' },
    { minSeconds: 3, message: 'Thinking deeply...' },
    { minSeconds: 8, message: 'Crafting response...' },
    { minSeconds: 15, message: 'This is complex, brewing wisdom... ☕' },
    { minSeconds: 30, message: 'Creating something amazing... 🎨' },
    { minSeconds: 60, message: 'Deep work in progress... 🧠' },
  ],
  fallback: [
    { minSeconds: 0, message: 'Processing...' },
    { minSeconds: 15, message: '☕ Complex request detected. Grab a coffee while I work...' },
    { minSeconds: 30, message: '🧠 Deep thinking... This one\'s a masterpiece in the making!' },
  ],
  completeMessage: '✨ Complete',
}

/** Helper to get the appropriate message for the current thinking time */
export function getThinkingMessage(
  config: ThinkingMessagesConfig,
  thinkingTime: number,
  hasAgent: boolean
): string {
  const steps = hasAgent ? config.withAgent : config.fallback
  // Find the highest threshold that's still <= thinkingTime
  let message = steps[0]?.message || 'Processing...'
  for (const step of steps) {
    if (thinkingTime >= step.minSeconds) {
      message = step.message
    } else {
      break
    }
  }
  return message
}
