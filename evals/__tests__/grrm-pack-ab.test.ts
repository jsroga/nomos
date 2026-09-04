import { describe, expect, it } from 'vitest'
import {
  GrrmPackAbStatus,
  measureComposeArms,
  scoreDraftArms,
} from '../experiments/grrm-pack-ab'

describe('grrm-pack-ab', () => {
  it('pack-on compose is longer than pack-off (skills included)', () => {
    const arms = measureComposeArms()
    expect(arms.packOnChars).toBeGreaterThan(arms.packOffChars)
    expect(arms.packOnFixtureChars).toBeGreaterThan(0)
  })

  it('scores s8/s9 deltas for two draft arms', () => {
    const scored = scoreDraftArms(
      ['She walked into the room and felt the tapestry of destiny underscore her pivotal choice.'],
      ['She walked in. The door stuck. She kicked it once and kept the letter.'],
    )
    expect(typeof scored.s8.delta).toBe('number')
    expect(typeof scored.s9.delta).toBe('number')
    expect(GrrmPackAbStatus.Skipped).toBe('skipped')
  })
})
