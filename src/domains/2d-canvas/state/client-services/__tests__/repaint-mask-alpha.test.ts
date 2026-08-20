import { describe, expect, it } from 'vitest'
import { applyLuminanceToAlpha } from '../repaint-mask-alpha'
import { RepaintRgba } from '../../../constants/repaint-service'

describe('applyLuminanceToAlpha', () => {
  it('copies red into alpha and fills RGB white', () => {
    const data = new Uint8ClampedArray([
      0,
      10,
      20,
      255,
      200,
      1,
      2,
      40,
    ])
    applyLuminanceToAlpha(data)
    expect(data[RepaintRgba.Red]).toBe(255)
    expect(data[RepaintRgba.Green]).toBe(255)
    expect(data[RepaintRgba.Blue]).toBe(255)
    expect(data[RepaintRgba.Alpha]).toBe(0)
    expect(data[RepaintRgba.Stride + RepaintRgba.Alpha]).toBe(200)
  })
})
