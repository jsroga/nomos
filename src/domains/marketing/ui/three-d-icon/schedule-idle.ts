import { MarketingIdleDeferMs } from '@/domains/marketing/constants/viewport-3d'

enum IdleScheduleKind {
  Idle = 'idle',
  Timeout = 'timeout',
}

type IdleHandle =
  | { kind: IdleScheduleKind.Idle; id: number }
  | { kind: IdleScheduleKind.Timeout; id: ReturnType<typeof setTimeout> }

function requestIdle(callback: () => void, timeoutMs: number): number | null {
  if (typeof window.requestIdleCallback !== 'function') return null
  return window.requestIdleCallback(callback, { timeout: timeoutMs })
}

function cancelIdle(id: number): void {
  if (typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(id)
  }
}

/** Schedule work after idle (or timeout fallback). Returns a cancel handle. */
export function scheduleIdle(
  callback: () => void,
  timeoutMs: number = MarketingIdleDeferMs.HeroTextEffects
): IdleHandle {
  const idleId = requestIdle(callback, timeoutMs)
  if (idleId !== null) {
    return { kind: IdleScheduleKind.Idle, id: idleId }
  }
  const id = setTimeout(callback, timeoutMs)
  return { kind: IdleScheduleKind.Timeout, id }
}

export function cancelScheduledIdle(handle: IdleHandle): void {
  if (handle.kind === IdleScheduleKind.Idle) {
    cancelIdle(handle.id)
    return
  }
  clearTimeout(handle.id)
}
