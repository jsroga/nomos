import { describe, expect, it } from 'vitest'
import {
  PORTRAIT_VARIANT_FALLBACK,
  PortraitVariantIndex,
  parsePortraitVariantIndex,
} from '../constants/portrait-variant'

describe('parsePortraitVariantIndex', () => {
  it('reads the first digit 1-4', () => {
    expect(parsePortraitVariantIndex('2')).toBe(PortraitVariantIndex.Two)
    expect(parsePortraitVariantIndex('Best match is 3 of 4.')).toBe(PortraitVariantIndex.Three)
    expect(parsePortraitVariantIndex('4')).toBe(PortraitVariantIndex.Four)
  })

  it('falls back to 1 when no variant digit is present', () => {
    expect(parsePortraitVariantIndex('')).toBe(PORTRAIT_VARIANT_FALLBACK)
    expect(parsePortraitVariantIndex('none')).toBe(PortraitVariantIndex.One)
  })
})
