import type { SelectBox } from './select-mode-service'

const MIN_WORLD_SIZE = 128
const ALIGNMENT = 32
const MAX_CANVAS_DIMENSION = 2048

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

export interface PixelLayout {
  pixelBounds: PixelBounds
  finalScale: number
  alignedWidth: number
  alignedHeight: number
}

export function computeWorldBoundsFromBox(box: SelectBox, padding: number): WorldBounds {
  const boxMinX = Math.min(box.x1, box.x2)
  const boxMinY = Math.min(box.y1, box.y2)
  const boxMaxX = Math.max(box.x1, box.x2)
  const boxMaxY = Math.max(box.y1, box.y2)

  const worldBounds: WorldBounds = {
    x: Math.floor(boxMinX - padding),
    y: Math.floor(boxMinY - padding),
    width: Math.ceil(boxMaxX - boxMinX + padding * 2),
    height: Math.ceil(boxMaxY - boxMinY + padding * 2),
  }

  worldBounds.width = Math.max(worldBounds.width, MIN_WORLD_SIZE)
  worldBounds.height = Math.max(worldBounds.height, MIN_WORLD_SIZE)

  return worldBounds
}

export function computeTileRange(worldBounds: WorldBounds, tileSize: number): TileRange {
  return {
    startTileX: Math.floor(worldBounds.x / tileSize),
    startTileY: Math.floor(worldBounds.y / tileSize),
    endTileX: Math.floor((worldBounds.x + worldBounds.width) / tileSize),
    endTileY: Math.floor((worldBounds.y + worldBounds.height) / tileSize),
  }
}

export function computePixelLayout(worldBounds: WorldBounds, scale: number): PixelLayout {
  let rawWidth = Math.round(worldBounds.width * scale)
  let rawHeight = Math.round(worldBounds.height * scale)
  let effectiveScale = scale

  if (rawWidth > MAX_CANVAS_DIMENSION || rawHeight > MAX_CANVAS_DIMENSION) {
    const downscaleFactor = Math.max(rawWidth, rawHeight) / MAX_CANVAS_DIMENSION
    effectiveScale = scale / downscaleFactor
    rawWidth = Math.round(worldBounds.width * effectiveScale)
    rawHeight = Math.round(worldBounds.height * effectiveScale)
  }

  const alignedWidth = rawWidth + ((ALIGNMENT - (rawWidth % ALIGNMENT)) % ALIGNMENT)
  const alignedHeight = rawHeight + ((ALIGNMENT - (rawHeight % ALIGNMENT)) % ALIGNMENT)

  const finalScale = effectiveScale
  const pixelBounds: PixelBounds = {
    x: Math.round(worldBounds.x * finalScale),
    y: Math.round(worldBounds.y * finalScale),
    width: alignedWidth,
    height: alignedHeight,
  }

  return { pixelBounds, finalScale, alignedWidth, alignedHeight }
}

export function computeRelativeBox(
  box: SelectBox,
  worldBounds: WorldBounds,
  finalScale: number,
): SelectBox {
  return {
    x1: (box.x1 - worldBounds.x) * finalScale,
    y1: (box.y1 - worldBounds.y) * finalScale,
    x2: (box.x2 - worldBounds.x) * finalScale,
    y2: (box.y2 - worldBounds.y) * finalScale,
  }
}
