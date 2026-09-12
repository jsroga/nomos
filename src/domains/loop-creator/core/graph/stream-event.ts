import {
  LoopOrchestratorEventType,
  LoopOrchestratorNodeStatus,
} from '@/domains/loop-creator/constants/loop-orchestrator'

export interface StreamEvent {
  type: LoopOrchestratorEventType
  node?: string
  agent?: string
  status?: LoopOrchestratorNodeStatus
  content?: string
  token?: string
  message?: {
    type: string
    content: string
    sender: string
    name: string
  }
  action?: {
    type: string
    payload: unknown
    confidence?: number
    reasoning?: string
  }
  questions?: unknown[]
  error?: string
  timestamp: number
}
