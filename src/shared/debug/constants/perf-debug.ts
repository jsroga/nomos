/**
 * Client perf tooling — opt-in via NEXT_PUBLIC_FF_* env flags.
 * Read as literals so Next can inline them into the browser bundle;
 * the server-side `isFeatureEnabled` helper cannot be used here.
 */

export enum PerfDebugEnv {
  Enabled = 'true',
}

export enum PerfDebugAnalyzeEnv {
  Enabled = 'true',
}

/** Live Core Web Vitals overlay (independent of React Scan). */
export enum CwvHudEnv {
  Enabled = 'true',
}

export enum PerfDebugHudRatingClass {
  Good = 'text-emerald-400',
  Poor = 'text-rose-400',
  NeedsImprovement = 'text-amber-300',
}

export enum CwvHudCopy {
  Title = 'Core Web Vitals',
  Waiting = 'waiting for metrics…',
  Hint = 'NEXT_PUBLIC_FF_CWV_HUD=true',
  Show = 'show',
  Hide = 'hide',
}

/** Keys on web-vitals attribution objects (attribution build). */
export enum CwvAttributionField {
  Attribution = 'attribution',
  Element = 'element',
  LargestShiftTarget = 'largestShiftTarget',
  InteractionTarget = 'interactionTarget',
  EventTarget = 'eventTarget',
}

export function isPerfDebugEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FF_PERF_DEBUG === PerfDebugEnv.Enabled
}

/** CWV HUD on its own flag, or as part of the full perf-debug overlay. */
export function isCwvHudEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_FF_CWV_HUD === CwvHudEnv.Enabled || isPerfDebugEnabled()
  )
}
