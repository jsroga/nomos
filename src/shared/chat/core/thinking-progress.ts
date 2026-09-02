/**
 * Copy for the "thinking" indicator while a turn produces no visible output.
 *
 * A reasoning model can spend a minute between `start-step` and its first tool
 * frame, and reasoning is not streamed to the client, so the thread has no data
 * to render for that whole window. Static dots make a working turn look hung,
 * so the label escalates and carries elapsed seconds — the only honest signal
 * available client-side.
 */

export enum ThinkingLabel {
  Thinking = 'Thinking',
  StillWorking = 'Still working',
  LongTurn = 'Still working — long turns can run past a minute',
}

const STILL_WORKING_AFTER_MS = 10_000
const LONG_TURN_AFTER_MS = 30_000
const MS_PER_SECOND = 1000

export interface ThinkingProgress {
  label: ThinkingLabel
  /** Whole seconds since the turn started; shown once the turn stops feeling instant. */
  seconds: number
  showSeconds: boolean
}

export function describeThinkingProgress(elapsedMs: number): ThinkingProgress {
  const safeElapsed = Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0
  const seconds = Math.floor(safeElapsed / MS_PER_SECOND)
  if (safeElapsed >= LONG_TURN_AFTER_MS) {
    return { label: ThinkingLabel.LongTurn, seconds, showSeconds: true }
  }
  if (safeElapsed >= STILL_WORKING_AFTER_MS) {
    return { label: ThinkingLabel.StillWorking, seconds, showSeconds: true }
  }
  return { label: ThinkingLabel.Thinking, seconds, showSeconds: false }
}
