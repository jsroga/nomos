import type { SelectBox } from './select-mode-types'

export const WORLD_TILE_SIZE = 512
export const MAX_MOSAIC_DIMENSION = 2048

const TILE_BOUNDARY_EPS = 1e-6
const MIN_CELL_SIZE = 1

export interface WorldBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface PixelBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface TileRange {
  startTileX: number
  startTileY: number
  endTileX: number
  endTileY: number
}

export interface MergedGridLayout {
  cellSize: number
  mosaicWidth: number
  mosaicHeight: number
  cols: number
  rows: number
  worldBounds: WorldBounds
  pixelBounds: PixelBounds
  relativeBox: SelectBox
}

function boxMinMax(box: SelectBox): {
  minX: number
  minY: number
  maxX: number
  maxY: number
} {
  return {
    minX: Math.min(box.x1, box.x2),
    minY: Math.min(box.y1, box.y2),
    maxX: Math.max(box.x1, box.x2),
    maxY: Math.max(box.y1, box.y2),
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function computeCoveringTileRange(
  box: SelectBox,
  tileSize: number = WORLD_TILE_SIZE,
): TileRange {
  const { minX, minY, maxX, maxY } = boxMinMax(box)
  const startTileX = Math.floor(minX / tileSize)
  const startTileY = Math.floor(minY / tileSize)
  const endTileX = Math.max(startTileX, Math.floor((maxX - TILE_BOUNDARY_EPS) / tileSize))
  const endTileY = Math.max(startTileY, Math.floor((maxY - TILE_BOUNDARY_EPS) / tileSize))
  return { startTileX, startTileY, endTileX, endTileY }
}

export function computeMergedWorldRect(
  range: TileRange,
  tileSize: number = WORLD_TILE_SIZE,
): WorldBounds {
  const cols = range.endTileX - range.startTileX + 1
  const rows = range.endTileY - range.startTileY + 1
  return {
    x: range.startTileX * tileSize,
    y: range.startTileY * tileSize,
    width: cols * tileSize,
    height: rows * tileSize,
  }
}

export function computeMergedGridLayout(input: {
  range: TileRange
  box: SelectBox
  nativeCellSize: number
  tileSize?: number
  maxDimension?: number
}): MergedGridLayout {
  const tileSize = input.tileSize ?? WORLD_TILE_SIZE
  const maxDimension = input.maxDimension ?? MAX_MOSAIC_DIMENSION
  const cols = input.range.endTileX - input.range.startTileX + 1
  const rows = input.range.endTileY - input.range.startTileY + 1
  const rawWidth = cols * input.nativeCellSize
  const rawHeight = rows * input.nativeCellSize
  const longest = Math.max(rawWidth, rawHeight)
  const cellSize =
    longest > maxDimension
      ? Math.max(MIN_CELL_SIZE, Math.floor((input.nativeCellSize * maxDimension) / longest))
      : input.nativeCellSize
  const mosaicWidth = cols * cellSize
  const mosaicHeight = rows * cellSize
  const worldBounds = computeMergedWorldRect(input.range, tileSize)
  const scale = cellSize / tileSize
  const relativeBox: SelectBox = {
    x1: clamp((input.box.x1 - worldBounds.x) * scale, 0, mosaicWidth),
    y1: clamp((input.box.y1 - worldBounds.y) * scale, 0, mosaicHeight),
    x2: clamp((input.box.x2 - worldBounds.x) * scale, 0, mosaicWidth),
    y2: clamp((input.box.y2 - worldBounds.y) * scale, 0, mosaicHeight),
  }

  return {
    cellSize,
    mosaicWidth,
    mosaicHeight,
    cols,
    rows,
    worldBounds,
    pixelBounds: { x: 0, y: 0, width: mosaicWidth, height: mosaicHeight },
    relativeBox,
  }
}

export function cellDrawOrigin(
  tileX: number,
  tileY: number,
  range: TileRange,
  cellSize: number,
): { x: number; y: number } {
  return {
    x: (tileX - range.startTileX) * cellSize,
    y: (tileY - range.startTileY) * cellSize,
  }
}
