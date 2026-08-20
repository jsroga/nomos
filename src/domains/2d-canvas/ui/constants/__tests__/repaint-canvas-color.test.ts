import { describe, expect, it } from 'vitest'
import { BLEEDING_DEFAULT_PARTICLE_COLOR } from '@/components/BleedingText/constants/bleeding-text-defaults'
import { RepaintCanvasColor } from '../../constants/repaint-canvas'

describe('RepaintCanvasColor.StrokeFill', () => {
  it('uses fully opaque landing-page bleeding red', () => {
    expect(RepaintCanvasColor.StrokeFill).toBe(BLEEDING_DEFAULT_PARTICLE_COLOR)
  })
})
