import { describe, expect, it, beforeEach } from 'vitest'
import {
  hasPendingHeightmapVersionBump,
  resetHeightmapVersionThrottle,
  shouldBumpHeightmapVersion,
  shouldFlushHeightmapVersion,
} from '@/domains/3d-canvas/core/heightmap-version-throttle'

describe('heightmap version throttle', () => {
  beforeEach(() => {
    resetHeightmapVersionThrottle()
  })

  it('allows the first bump immediately', () => {
    expect(shouldBumpHeightmapVersion(1000)).toBe(true)
  })

  it('throttles rapid bumps and flushes on stroke end', () => {
    expect(shouldBumpHeightmapVersion(1000)).toBe(true)
    expect(shouldBumpHeightmapVersion(1010)).toBe(false)
    expect(hasPendingHeightmapVersionBump()).toBe(true)
    expect(shouldFlushHeightmapVersion()).toBe(true)
    expect(hasPendingHeightmapVersionBump()).toBe(false)
  })

  it('allows another bump after the interval', () => {
    expect(shouldBumpHeightmapVersion(1000)).toBe(true)
    expect(shouldBumpHeightmapVersion(1040)).toBe(true)
  })
})
