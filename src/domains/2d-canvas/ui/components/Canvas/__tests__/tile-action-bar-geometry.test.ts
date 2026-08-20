import { describe, expect, it } from 'vitest'
import {
  TILE_ACTION_BAR_GAP_PX,
  TILE_ACTION_BAR_VIEWPORT_MARGIN_PX,
  TileActionBarVariant,
} from '@/domains/2d-canvas/ui/constants/tile-action-bar'
import {
  resolveTileActionBarVariant,
  tileActionBarPosition,
  tileScreenRect,
} from '../tile-action-bar-geometry'

describe('resolveTileActionBarVariant', () => {
  it('hides when nothing is selected', () => {
    expect(
      resolveTileActionBarVariant({
        hasSelection: false,
        hasArt: true,
        busy: false,
        isPanMode: true,
      }),
    ).toBe(TileActionBarVariant.Hidden)
  })

  it('hides in paint and fragment tools', () => {
    expect(
      resolveTileActionBarVariant({
        hasSelection: true,
        hasArt: true,
        busy: false,
        isPanMode: false,
      }),
    ).toBe(TileActionBarVariant.Hidden)
  })

  it('uses busy over ready and empty', () => {
    expect(
      resolveTileActionBarVariant({
        hasSelection: true,
        hasArt: true,
        busy: true,
        isPanMode: true,
      }),
    ).toBe(TileActionBarVariant.Busy)
    expect(
      resolveTileActionBarVariant({
        hasSelection: true,
        hasArt: false,
        busy: true,
        isPanMode: true,
      }),
    ).toBe(TileActionBarVariant.Busy)
  })

  it('uses empty when the selected tile has no art', () => {
    expect(
      resolveTileActionBarVariant({
        hasSelection: true,
        hasArt: false,
        busy: false,
        isPanMode: true,
      }),
    ).toBe(TileActionBarVariant.Empty)
  })

  it('uses ready when the selected tile has art', () => {
    expect(
      resolveTileActionBarVariant({
        hasSelection: true,
        hasArt: true,
        busy: false,
        isPanMode: true,
      }),
    ).toBe(TileActionBarVariant.Ready)
  })
})

describe('tileActionBarPosition', () => {
  it('places the bar above the tile when there is room', () => {
    const tile = tileScreenRect(0, 0, { x: 0, y: 0, scale: 1 }, 800, 600)
    const position = tileActionBarPosition(tile, 800, 320)
    expect(position.top).toBeLessThan(tile.top)
    expect(position.left).toBeGreaterThanOrEqual(TILE_ACTION_BAR_VIEWPORT_MARGIN_PX)
  })

  it('flips below the tile when there is no room above', () => {
    const tile = { left: 40, top: 10, width: 128, height: 128 }
    const position = tileActionBarPosition(tile, 800, 320)
    expect(position.top).toBe(tile.top + tile.height + TILE_ACTION_BAR_GAP_PX)
  })
})
