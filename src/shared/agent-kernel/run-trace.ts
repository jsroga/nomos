/** Typed run events for beat-draft (and later workflows). Emit must never fail the run. */

export enum RunTraceEventType {
  ToolCall = 'tool.call',
  RoleDispatch = 'role.dispatch',
  RoleResult = 'role.result',
  PersistCommit = 'persist.commit',
  GateDecision = 'gate.decision',
  SkillResolve = 'skill.resolve',
  ClaimCheckFail = 'claim.check.fail',
}

export interface RunTraceEvent {
  type: RunTraceEventType
  at: number
  stepId?: string
  role?: string
  detail?: string
}

type RunTraceListener = (event: RunTraceEvent) => void

const listeners = new Set<RunTraceListener>()

export function subscribeRunTrace(listener: RunTraceListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function emitRunTrace(event: Omit<RunTraceEvent, 'at'>): void {
  try {
    const stamped: RunTraceEvent = { ...event, at: Date.now() }
    for (const listener of listeners) {
      listener(stamped)
    }
  } catch {
    /* tracing must not fail the run */
  }
}
