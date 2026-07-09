/**
 * Wire-format types for agent actions flowing through chat SSE.
 * Shared by chat UI and storyteller execute pipeline — no domain casts at boundaries.
 */

export enum ApprovalActionStatus {
  PENDING = 'pending',
  EXECUTING = 'executing',
  COMMITTED = 'committed',
  REJECTED = 'rejected',
}

const APPROVAL_STATUS_VALUES = new Set<string>(Object.values(ApprovalActionStatus))

export function isApprovalActionStatus(value: string): value is ApprovalActionStatus {
  return APPROVAL_STATUS_VALUES.has(value)
}

/** Pre-validation action from stream / approval UI (open `type` + `payload`). */
export interface WireAgentAction {
  type: string
  payload?: unknown
  reasoning?: string
  status?: ApprovalActionStatus
  id?: string
  /** 0–1 agent self-estimate; legacy emitters may include it, UI defaults when absent. */
  confidence?: number
}

export interface ActionMessageLocation {
  messageIndex: number
  actionIndex: number
}
