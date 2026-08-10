import { HeightmapVersionThrottleMs } from '@/domains/3d-canvas/constants/render-quality'

let lastBumpAt = 0
let pendingBump = false

/** Returns true when a heightmapVersion bump should notify consumers (~30 Hz). */
export function shouldBumpHeightmapVersion(now = performance.now()): boolean {
  if (now - lastBumpAt >= HeightmapVersionThrottleMs.MinInterval) {
    lastBumpAt = now
    pendingBump = false
    return true
  }
  pendingBump = true
  return false
}

/** Force a version bump after a brush stroke ends (flush pending). */
export function shouldFlushHeightmapVersion(): boolean {
  if (!pendingBump) return false
  pendingBump = false
  lastBumpAt = performance.now()
  return true
}

/** Test helper — reset throttle state between unit cases. */
export function resetHeightmapVersionThrottle(): void {
  lastBumpAt = 0
  pendingBump = false
}

export function hasPendingHeightmapVersionBump(): boolean {
  return pendingBump
}
