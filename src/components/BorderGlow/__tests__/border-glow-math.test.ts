import { describe, expect, it } from 'vitest'
import {
  borderGlowLayerOpacity,
  glowCursorAngle,
  glowEdgeProximity,
  isLightHexColor,
  parseGlowHsl,
} from '../border-glow-math'
import {
  BORDER_GLOW_HSL_FALLBACK,
  BORDER_GLOW_LAYOUT,
  BorderGlowCss,
} from '../constants/border-glow'

describe('border glow math', () => {
  it('parses HSL triples and falls back when the string is empty', () => {
    expect(parseGlowHsl(BorderGlowCss.GlowColor)).toEqual({
      h: BORDER_GLOW_HSL_FALLBACK.h,
      s: BORDER_GLOW_HSL_FALLBACK.s,
      l: BORDER_GLOW_HSL_FALLBACK.l,
    })
    expect(parseGlowHsl('')).toEqual({
      h: BORDER_GLOW_HSL_FALLBACK.h,
      s: BORDER_GLOW_HSL_FALLBACK.s,
      l: BORDER_GLOW_HSL_FALLBACK.l,
    })
  })

  it('treats #fff as light and non-hex as not light', () => {
    expect(isLightHexColor('#ffffff')).toBe(true)
    expect(isLightHexColor('#120F17')).toBe(false)
    expect(isLightHexColor('transparent')).toBe(false)
  })

  it('measures edge proximity and angle from the element center', () => {
    expect(glowEdgeProximity(100, 100, 50, 50)).toBe(0)
    expect(glowEdgeProximity(100, 100, 100, 50)).toBe(1)
    expect(glowCursorAngle(100, 100, 100, 50)).toBe(90)
  })

  it('keeps glow layers dark until the pointer is near the edge', () => {
    expect(
      borderGlowLayerOpacity({
        hovered: false,
        sweepActive: false,
        edgeProximity: 1,
        edgeSensitivity: BORDER_GLOW_LAYOUT.edgeSensitivity,
      }),
    ).toEqual({ isVisible: false, borderOpacity: 0, glowOpacity: 0 })
    const near = borderGlowLayerOpacity({
      hovered: true,
      sweepActive: false,
      edgeProximity: 1,
        edgeSensitivity: BORDER_GLOW_LAYOUT.edgeSensitivity,
    })
    expect(near.isVisible).toBe(true)
    expect(near.glowOpacity).toBeGreaterThan(0)
  })
})
