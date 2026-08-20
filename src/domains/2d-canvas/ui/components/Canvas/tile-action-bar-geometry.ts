import { TILE_SIZE } from '@/domains/2d-canvas/ui/components/Canvas/world-canvas-tiles'
import {
  TILE_ACTION_BAR_GAP_PX,
  TILE_ACTION_BAR_HEIGHT_PX,
  TILE_ACTION_BAR_VIEWPORT_MARGIN_PX,
  TileActionBarVariant,
} from '@/domains/2d-canvas/ui/constants/tile-action-bar'

export interface TileScreenRect {
  left: number
  top: number
  width: number
  height: number
}

export function tileScreenRect(
  x: number,
  y: number,
  viewport: { x: number; y: number; scale: number },
  viewW: number,
  viewH: number,
): TileScreenRect {
  const scale = viewport.scale || 1
  const size = TILE_SIZE * scale
  return {
    left: viewW / 2 + viewport.x + x * TILE_SIZE * scale,
    top: viewH / 2 + viewport.y + y * TILE_SIZE * scale,
    width: size,
    height: size,
  }
}

export function tileActionBarPosition(
  tile: TileScreenRect,
  viewW: number,
  barWidth: number,
): { left: number; top: number } {
  const above = tile.top - TILE_ACTION_BAR_GAP_PX - TILE_ACTION_BAR_HEIGHT_PX
  const top =
    above < TILE_ACTION_BAR_VIEWPORT_MARGIN_PX
      ? tile.top + tile.height + TILE_ACTION_BAR_GAP_PX
      : above
  const maxLeft = Math.max(
    TILE_ACTION_BAR_VIEWPORT_MARGIN_PX,
    viewW - barWidth - TILE_ACTION_BAR_VIEWPORT_MARGIN_PX,
  )
  const left = Math.min(Math.max(tile.left, TILE_ACTION_BAR_VIEWPORT_MARGIN_PX), maxLeft)
  return { left, top }
}

export function resolveTileActionBarVariant(input: {
  hasSelection: boolean
  hasArt: boolean
  busy: boolean
  isPanMode: boolean
}): TileActionBarVariant {
  if (!input.isPanMode) return TileActionBarVariant.Hidden
  if (!input.hasSelection) return TileActionBarVariant.Hidden
  if (input.busy) return TileActionBarVariant.Busy
  if (!input.hasArt) return TileActionBarVariant.Empty
  return TileActionBarVariant.Ready
}
