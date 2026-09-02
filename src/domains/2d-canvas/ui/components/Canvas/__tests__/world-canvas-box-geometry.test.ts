import { describe, expect, it } from 'vitest'
import { boxFromDragPoints, boxFromSelectBox } from '../world-canvas-box-geometry'

describe('world-canvas-box-geometry', () => {
  describe('boxFromDragPoints', () => {
    it('creates correct bounding box for top-left to bottom-right drag', () => {
      const start = { x: 50, y: 50 }
      const end = { x: 200, y: 150 }
      const box = boxFromDragPoints(start, end)

      expect(box).toEqual({
        x: 50,
        y: 50,
        width: 150,
        height: 100,
      })
    })

    it('creates correct bounding box for bottom-right to top-left drag (reversed coordinates)', () => {
      const start = { x: 300, y: 250 }
      const end = { x: 100, y: 100 }
      const box = boxFromDragPoints(start, end)

      expect(box).toEqual({
        x: 100,
        y: 100,
        width: 200,
        height: 150,
      })
    })

    it('handles negative coordinates correctly', () => {
      const start = { x: -100, y: -50 }
      const end = { x: -20, y: 30 }
      const box = boxFromDragPoints(start, end)

      expect(box).toEqual({
        x: -100,
        y: -50,
        width: 80,
        height: 80,
      })
    })

    it('handles zero width and zero height drag (single point click)', () => {
      const start = { x: 75, y: 75 }
      const end = { x: 75, y: 75 }
      const box = boxFromDragPoints(start, end)

      expect(box).toEqual({
        x: 75,
        y: 75,
        width: 0,
        height: 0,
      })
    })
  })

  describe('boxFromSelectBox', () => {
    it('converts AxisAlignedBox to ScreenRect', () => {
      const selectBox = { x1: 10, y1: 20, x2: 110, y2: 120 }
      const rect = boxFromSelectBox(selectBox)

      expect(rect).toEqual({
        x: 10,
        y: 20,
        width: 100,
        height: 100,
      })
    })

    it('handles inverted AxisAlignedBox coordinates (x1 > x2, y1 > y2)', () => {
      const selectBox = { x1: 500, y1: 400, x2: 200, y2: 100 }
      const rect = boxFromSelectBox(selectBox)

      expect(rect).toEqual({
        x: 200,
        y: 100,
        width: 300,
        height: 300,
      })
    })
  })
})
