import { describe, expect, it } from 'vitest'
import {
  cellDrawOrigin,
  computeCoveringTileRange,
  computeMergedGridLayout,
  computeMergedWorldRect,
  MAX_MOSAIC_DIMENSION,
  WORLD_TILE_SIZE,
} from '../select-mode-segment-bounds'

describe('computeCoveringTileRange', () => {
  it('covers a 4-tile building box as a 2x2 grid', () => {
    const range = computeCoveringTileRange({ x1: 100, y1: 100, x2: 900, y2: 900 })
    expect(range).toEqual({
      startTileX: 0,
      startTileY: 0,
      endTileX: 1,
      endTileY: 1,
    })
    expect(computeMergedWorldRect(range)).toEqual({
      x: 0,
      y: 0,
      width: WORLD_TILE_SIZE * 2,
      height: WORLD_TILE_SIZE * 2,
    })
  })

  it('does not pull a third column when the box ends on a tile edge', () => {
    const range = computeCoveringTileRange({
      x1: 0,
      y1: 0,
      x2: WORLD_TILE_SIZE * 2,
      y2: WORLD_TILE_SIZE * 2,
    })
    expect(range.endTileX).toBe(1)
    expect(range.endTileY).toBe(1)
  })

  it('uses min/max so inverted drag still covers the same tiles', () => {
    const range = computeCoveringTileRange({ x1: 900, y1: 900, x2: 100, y2: 100 })
    expect(range).toEqual({
      startTileX: 0,
      startTileY: 0,
      endTileX: 1,
      endTileY: 1,
    })
  })
})

describe('computeMergedGridLayout', () => {
  const range = {
    startTileX: 0,
    startTileY: 0,
    endTileX: 1,
    endTileY: 1,
  }
  const box = { x1: 100, y1: 100, x2: 900, y2: 900 }

  it('maps the user box into 1024-native mosaic pixels', () => {
    const layout = computeMergedGridLayout({
      range,
      box,
      nativeCellSize: 1024,
    })
    expect(layout.cellSize).toBe(1024)
    expect(layout.mosaicWidth).toBe(2048)
    expect(layout.mosaicHeight).toBe(2048)
    expect(layout.relativeBox).toEqual({
      x1: 200,
      y1: 200,
      x2: 1800,
      y2: 1800,
    })
  })

  it('uses the max native size as the cell size', () => {
    const layout = computeMergedGridLayout({
      range,
      box,
      nativeCellSize: 1024,
    })
    expect(layout.cellSize).toBe(1024)
    expect(cellDrawOrigin(1, 0, range, layout.cellSize)).toEqual({ x: 1024, y: 0 })
  })

  it('downscales 2x2 of 2048 cells uniformly under the mosaic cap', () => {
    const layout = computeMergedGridLayout({
      range,
      box,
      nativeCellSize: 2048,
      maxDimension: MAX_MOSAIC_DIMENSION,
    })
    expect(layout.cellSize).toBe(1024)
    expect(layout.mosaicWidth).toBe(MAX_MOSAIC_DIMENSION)
    expect(layout.mosaicHeight).toBe(MAX_MOSAIC_DIMENSION)
    expect(layout.relativeBox.x1).toBe(200)
    expect(layout.relativeBox.x2).toBe(1800)
  })
})
