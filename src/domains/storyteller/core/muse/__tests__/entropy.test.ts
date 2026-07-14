import { describe, expect, it } from 'vitest'
import {
  dealEntropyHands,
  formatEntropyHand,
  mulberry32,
  seedFromText,
} from '../entropy'
import { CRAFT_MECHANISMS } from '../constants/craft-contrast'

describe('entropy injector', () => {
  it('is deterministic for a given seed', () => {
    const a = dealEntropyHands(42, 5)
    const b = dealEntropyHands(42, 5)
    expect(a).toEqual(b)
  })

  it('differs across seeds', () => {
    const a = dealEntropyHands(1, 5)
    const b = dealEntropyHands(2, 5)
    expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b))
  })

  it('deals mechanisms without replacement within a batch', () => {
    const hands = dealEntropyHands(7, CRAFT_MECHANISMS.length)
    const ids = hands.map(h => h.mechanism.id)
    expect(new Set(ids).size).toBe(CRAFT_MECHANISMS.length)
  })

  it('reshuffles when a batch exceeds the mechanism deck', () => {
    const hands = dealEntropyHands(9, CRAFT_MECHANISMS.length + 3)
    expect(hands).toHaveLength(CRAFT_MECHANISMS.length + 3)
    for (const hand of hands) {
      expect(hand.mechanism.id).toBeTruthy()
    }
  })

  it('seedFromText is stable and spreads', () => {
    expect(seedFromText('episode-1')).toBe(seedFromText('episode-1'))
    expect(seedFromText('episode-1')).not.toBe(seedFromText('episode-2'))
  })

  it('mulberry32 yields values in [0, 1)', () => {
    const rng = mulberry32(123)
    for (let i = 0; i < 100; i++) {
      const value = rng()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('formats a hand with all constraints present', () => {
    const [hand] = dealEntropyHands(3, 1)
    const text = formatEntropyHand(hand)
    expect(text).toContain(hand.prop)
    expect(text).toContain(hand.urgency)
    expect(text).toContain(hand.venue)
    expect(text).toContain(hand.reversal)
    expect(text).toContain(hand.mechanism.antiPattern)
    // The source anchor must NOT leak into the prompt (no imitation bait).
    expect(text).not.toContain(hand.mechanism.source)
  })
})
