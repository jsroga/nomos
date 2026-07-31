import {
  assignHeroAbVariant,
  heroAbWeightsFromEnv,
  parseHeroAbCookieValue,
  resolveHeroAbWeights,
} from '@/domains/marketing/core/hero-ab'
import {
  LANDING_HERO_AB_DEFAULT_PCT,
  LandingHeroAbVariant,
} from '@/domains/marketing/constants/hero-ab'
import { describe, expect, it } from 'vitest'

describe('resolveHeroAbWeights', () => {
  it('defaults to 50/50 when unset', () => {
    expect(resolveHeroAbWeights(undefined, undefined)).toEqual({
      aPct: LANDING_HERO_AB_DEFAULT_PCT,
      bPct: LANDING_HERO_AB_DEFAULT_PCT,
    })
  })

  it('fills remainder when only B is set', () => {
    expect(resolveHeroAbWeights(undefined, '30')).toEqual({ aPct: 70, bPct: 30 })
  })

  it('fills remainder when only A is set', () => {
    expect(resolveHeroAbWeights('20', undefined)).toEqual({ aPct: 20, bPct: 80 })
  })

  it('normalizes when A+B ≠ 100', () => {
    expect(resolveHeroAbWeights('1', '1')).toEqual({ aPct: 50, bPct: 50 })
  })
})

describe('assignHeroAbVariant', () => {
  const weights = { aPct: 70, bPct: 30 }

  it('maps rolls below aPct to A', () => {
    expect(assignHeroAbVariant(weights, 0)).toBe(LandingHeroAbVariant.A)
    expect(assignHeroAbVariant(weights, 69.9)).toBe(LandingHeroAbVariant.A)
  })

  it('maps rolls at/above aPct to B', () => {
    expect(assignHeroAbVariant(weights, 70)).toBe(LandingHeroAbVariant.B)
    expect(assignHeroAbVariant(weights, 99)).toBe(LandingHeroAbVariant.B)
  })
})

describe('parseHeroAbCookieValue', () => {
  it('accepts a/b only', () => {
    expect(parseHeroAbCookieValue('a')).toBe(LandingHeroAbVariant.A)
    expect(parseHeroAbCookieValue('b')).toBe(LandingHeroAbVariant.B)
    expect(parseHeroAbCookieValue('x')).toBeNull()
  })
})

describe('heroAbWeightsFromEnv', () => {
  it('reads LANDING_HERO_AB_*_PCT', () => {
    expect(
      heroAbWeightsFromEnv({
        LANDING_HERO_AB_A_PCT: '40',
        LANDING_HERO_AB_B_PCT: '60',
      }),
    ).toEqual({ aPct: 40, bPct: 60 })
  })
})
