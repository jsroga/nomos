import { describe, expect, it } from 'vitest'
import {
  repaintResultImageTransform,
  repaintResultScreenRect,
  repaintReviewBarTransform,
} from '../repaint-review-geometry'
import { REPAINT_REVIEW_GAP_PX } from '@/domains/2d-canvas/ui/constants/repaint-review'

describe('repaint review geometry', () => {
  it('places the result overlay from viewport + bounds', () => {
    const rect = repaintResultScreenRect(
      { x: 10, y: 20, width: 100, height: 40 },
      { x: 4, y: 8, scale: 2 },
    )
    expect(rect).toEqual({
      translateX: 24,
      translateY: 48,
      width: 200,
      height: 80,
    })
    expect(repaintResultImageTransform(rect)).toBe('translate(24px, 48px)')
  })

  it('centers the review bar under the overlay', () => {
    const rect = {
      translateX: 10,
      translateY: 20,
      width: 100,
      height: 40,
    }
    expect(repaintReviewBarTransform(rect)).toBe(
      `translate(60px, ${60 + REPAINT_REVIEW_GAP_PX}px) translateX(-50%)`,
    )
  })
})
