/**
 * Copy for the "thinking" indicator while a turn produces no visible output.
 *
 * A reasoning model can spend a while between `start` and its first token.
 * Until reasoning, a tool, or text arrives, the thread only has this wait label
 * plus elapsed seconds.
 */

export enum ThinkingLabel {
  Thinking = 'Waiting for first token',
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
