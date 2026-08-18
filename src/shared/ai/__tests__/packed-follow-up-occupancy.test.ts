import { describe, expect, it } from 'vitest'
import {
  neighborCount,
  PACKED_TILE_SIZE,
  tightPackedCanvasLayout,
} from '../context-pack-layout'

const TILE = PACKED_TILE_SIZE

describe('tightPackedCanvasLayout 8-neighbor occupancy', () => {
  it('paints bottomLeft in the 2×2 left+down hole', () => {
    const layout = tightPackedCanvasLayout({
      left: true,
      right: false,
      up: false,
      down: true,
      bottomLeft: true,
    })
    expect(layout.width).toBe(1024)
    expect(layout.height).toBe(1024)
    expect(layout.hole).toEqual({ x: TILE, y: 0, width: TILE, height: TILE })
    expect(layout.left).toEqual({ x: 0, y: 0 })
    expect(layout.down).toEqual({ x: TILE, y: TILE })
    expect(layout.bottomLeft).toEqual({ x: 0, y: TILE })
    expect(layout.topLeft).toBeUndefined()
  })

  it.each([
    {
      name: 'left+up+topLeft',
      flags: { left: true, right: false, up: true, down: false, topLeft: true },
      hole: { x: TILE, y: TILE },
      corner: 'topLeft' as const,
      dest: { x: 0, y: 0 },
    },
    {
      name: 'right+up+topRight',
      flags: { left: false, right: true, up: true, down: false, topRight: true },
      hole: { x: 0, y: TILE },
      corner: 'topRight' as const,
      dest: { x: TILE, y: 0 },
    },
    {
      name: 'right+down+bottomRight',
      flags: { left: false, right: true, up: false, down: true, bottomRight: true },
      hole: { x: 0, y: 0 },
      corner: 'bottomRight' as const,
      dest: { x: TILE, y: TILE },
    },
  ])('$name places the diagonal in the 2×2', ({ flags, hole, corner, dest }) => {
    const layout = tightPackedCanvasLayout(flags)
    expect(layout.width).toBe(1024)
    expect(layout.height).toBe(1024)
    expect(layout.hole.x).toBe(hole.x)
    expect(layout.hole.y).toBe(hole.y)
    expect(layout[corner]).toEqual(dest)
  })

  it('expands the down row for left+bottomLeft without down', () => {
    const layout = tightPackedCanvasLayout({
      left: true,
      right: false,
      up: false,
      down: false,
      bottomLeft: true,
    })
    expect(layout.width).toBe(1024)
    expect(layout.height).toBe(1024)
    expect(layout.hole).toEqual({ x: TILE, y: 0, width: TILE, height: TILE })
    expect(layout.left).toEqual({ x: 0, y: 0 })
    expect(layout.down).toBeUndefined()
    expect(layout.bottomLeft).toEqual({ x: 0, y: TILE })
  })

  it('sizes a diagonal-only pack as 1024×1024', () => {
    const layout = tightPackedCanvasLayout({
      left: false,
      right: false,
      up: false,
      down: false,
      bottomLeft: true,
    })
    expect(layout.width).toBe(1024)
    expect(layout.height).toBe(1024)
    expect(layout.hole).toEqual({ x: TILE, y: 0, width: TILE, height: TILE })
    expect(layout.bottomLeft).toEqual({ x: 0, y: TILE })
    expect(layout.left).toBeUndefined()
    expect(layout.down).toBeUndefined()
  })

  it('places all eight dests on a 3×3 ring', () => {
    const layout = tightPackedCanvasLayout({
      left: true,
      right: true,
      up: true,
      down: true,
      topLeft: true,
      topRight: true,
      bottomLeft: true,
      bottomRight: true,
    })
    expect(layout.width).toBe(1536)
    expect(layout.height).toBe(1536)
    expect(layout.hole).toEqual({ x: TILE, y: TILE, width: TILE, height: TILE })
    expect(layout.topLeft).toEqual({ x: 0, y: 0 })
    expect(layout.up).toEqual({ x: TILE, y: 0 })
    expect(layout.topRight).toEqual({ x: TILE * 2, y: 0 })
    expect(layout.left).toEqual({ x: 0, y: TILE })
    expect(layout.right).toEqual({ x: TILE * 2, y: TILE })
    expect(layout.bottomLeft).toEqual({ x: 0, y: TILE * 2 })
    expect(layout.down).toEqual({ x: TILE, y: TILE * 2 })
    expect(layout.bottomRight).toEqual({ x: TILE * 2, y: TILE * 2 })
  })

  it('keeps left-only 1024×512 when no diagonal is present', () => {
    const layout = tightPackedCanvasLayout({
      left: true,
      right: false,
      up: false,
      down: false,
    })
    expect(layout.width).toBe(1024)
    expect(layout.height).toBe(512)
    expect(layout.bottomLeft).toBeUndefined()
    expect(layout.topLeft).toBeUndefined()
  })

  it('counts diagonals in neighborCount', () => {
    expect(
      neighborCount({
        left: true,
        right: false,
        up: false,
        down: true,
        bottomLeft: true,
      }),
    ).toBe(3)
  })
})
