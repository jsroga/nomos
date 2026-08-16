import {
  ApiframeGenerateAspectRatio,
  APIFRAME_GENERATE_ASPECT_RATIOS,
} from '@/shared/ai/constants/apiframe'

export const PACKED_TILE_SIZE = 512
export const PACKED_LONG_SIDE_CAP = 2048

export const PACKED_HOLE_RGB = { r: 128, g: 128, b: 128 } as const
export const PACKED_CANVAS_RGB = { r: 0, g: 0, b: 0 } as const
export const PACKED_HOLE_CSS = '#808080'
export const PACKED_CANVAS_CSS = '#000000'

export interface CardinalPresence {
  left: boolean
  right: boolean
  up: boolean
  down: boolean
}

export interface PackedCropRect {
  x: number
  y: number
  width: number
  height: number
}

export interface PackedCellDest {
  x: number
  y: number
}

export interface PackedCanvasLayout {
  width: number
  height: number
  cellSize: number
  hole: PackedCropRect
  left?: PackedCellDest
  right?: PackedCellDest
  up?: PackedCellDest
  down?: PackedCellDest
}

export interface PackedCropSpec {
  cropRect: PackedCropRect
  packedWidth: number
  packedHeight: number
}

interface AllowedAspect {
  ratio: ApiframeGenerateAspectRatio
  w: number
  h: number
}

const ALLOWED_ASPECTS: readonly AllowedAspect[] = [
  { ratio: ApiframeGenerateAspectRatio.Square, w: 1, h: 1 },
  { ratio: ApiframeGenerateAspectRatio.PortraitTwoThree, w: 2, h: 3 },
  { ratio: ApiframeGenerateAspectRatio.LandscapeThreeTwo, w: 3, h: 2 },
  { ratio: ApiframeGenerateAspectRatio.Widescreen, w: 16, h: 9 },
  { ratio: ApiframeGenerateAspectRatio.TallNineSixteen, w: 9, h: 16 },
]

function cellFlag(present: boolean): number {
  return present ? 1 : 0
}

export function cardinalCount(presence: CardinalPresence): number {
  return (
    cellFlag(presence.left) +
    cellFlag(presence.right) +
    cellFlag(presence.up) +
    cellFlag(presence.down)
  )
}

/** Tight pack: full 512 cardinals, grey hole only. Missing sides omitted. */
export function tightPackedCanvasLayout(presence: CardinalPresence): PackedCanvasLayout {
  const holeX = presence.left ? PACKED_TILE_SIZE : 0
  const holeY = presence.up ? PACKED_TILE_SIZE : 0
  const width =
    PACKED_TILE_SIZE + PACKED_TILE_SIZE * (cellFlag(presence.left) + cellFlag(presence.right))
  const height =
    PACKED_TILE_SIZE + PACKED_TILE_SIZE * (cellFlag(presence.up) + cellFlag(presence.down))
  const layout: PackedCanvasLayout = {
    width,
    height,
    cellSize: PACKED_TILE_SIZE,
    hole: { x: holeX, y: holeY, width: PACKED_TILE_SIZE, height: PACKED_TILE_SIZE },
  }
  if (presence.left) layout.left = { x: 0, y: holeY }
  if (presence.right) layout.right = { x: holeX + PACKED_TILE_SIZE, y: holeY }
  if (presence.up) layout.up = { x: holeX, y: 0 }
  if (presence.down) layout.down = { x: holeX, y: holeY + PACKED_TILE_SIZE }
  return layout
}

/** Sent canvas: letterboxed to an Apiframe-allowed ratio, then long-side capped. */
export function packedCanvasLayout(presence: CardinalPresence): PackedCanvasLayout {
  return applyPackedLongSideCap(padPackedLayoutToAllowedAspect(tightPackedCanvasLayout(presence)))
}

export function packedCropSpecFromLayout(layout: PackedCanvasLayout): PackedCropSpec {
  return {
    cropRect: layout.hole,
    packedWidth: layout.width,
    packedHeight: layout.height,
  }
}

/** Map the packed hole into the output with uniform scale (contain), not stretch. */
export function scaleCropRect(
  cropRect: PackedCropRect,
  packedWidth: number,
  packedHeight: number,
  outWidth: number,
  outHeight: number,
): PackedCropRect {
  const packedW = packedWidth > 0 ? packedWidth : 1
  const packedH = packedHeight > 0 ? packedHeight : 1
  const scale = Math.min(outWidth / packedW, outHeight / packedH)
  const contentW = packedW * scale
  const contentH = packedH * scale
  const originX = (outWidth - contentW) / 2
  const originY = (outHeight - contentH) / 2
  return clampCropRect(
    {
      x: Math.round(originX + cropRect.x * scale),
      y: Math.round(originY + cropRect.y * scale),
      width: Math.max(1, Math.round(cropRect.width * scale)),
      height: Math.max(1, Math.round(cropRect.height * scale)),
    },
    outWidth,
    outHeight,
  )
}

export function packedAspectRatio(width: number, height: number): ApiframeGenerateAspectRatio {
  if (width <= 0 || height <= 0) return ApiframeGenerateAspectRatio.Square
  return targetAllowedAspect(width, height).ratio
}

export function isApiframeGenerateAspectRatio(value: string): boolean {
  return APIFRAME_GENERATE_ASPECT_RATIOS.some(ratio => ratio === value)
}

export function padPackedLayoutToAllowedAspect(layout: PackedCanvasLayout): PackedCanvasLayout {
  const allowed = targetAllowedAspect(layout.width, layout.height)
  const target = allowed.w / allowed.h
  const current = layout.width / layout.height
  let outW = layout.width
  let outH = layout.height
  if (current > target) {
    outH = Math.round((layout.width * allowed.h) / allowed.w)
  } else if (current < target) {
    outW = Math.round((layout.height * allowed.w) / allowed.h)
  }
  const padLeft = Math.floor((outW - layout.width) / 2)
  const padTop = Math.floor((outH - layout.height) / 2)
  if (padLeft === 0 && padTop === 0 && outW === layout.width && outH === layout.height) {
    return layout
  }
  return offsetLayout(layout, padLeft, padTop, outW, outH)
}

function targetAllowedAspect(width: number, height: number): AllowedAspect {
  for (const candidate of ALLOWED_ASPECTS) {
    if (width * candidate.h === height * candidate.w) return candidate
  }
  const current = width / height
  const fallback: AllowedAspect = {
    ratio: ApiframeGenerateAspectRatio.Square,
    w: 1,
    h: 1,
  }
  let best: AllowedAspect = fallback
  let bestDist = Number.POSITIVE_INFINITY
  for (const candidate of ALLOWED_ASPECTS) {
    const dist = Math.abs(current - candidate.w / candidate.h)
    if (dist < bestDist) {
      best = candidate
      bestDist = dist
    }
  }
  return best
}

function offsetLayout(
  layout: PackedCanvasLayout,
  dx: number,
  dy: number,
  width: number,
  height: number,
): PackedCanvasLayout {
  return {
    width,
    height,
    cellSize: layout.cellSize,
    hole: offsetRect(layout.hole, dx, dy),
    left: offsetDest(layout.left, dx, dy),
    right: offsetDest(layout.right, dx, dy),
    up: offsetDest(layout.up, dx, dy),
    down: offsetDest(layout.down, dx, dy),
  }
}

function offsetRect(rect: PackedCropRect, dx: number, dy: number): PackedCropRect {
  return { x: rect.x + dx, y: rect.y + dy, width: rect.width, height: rect.height }
}

function offsetDest(dest: PackedCellDest | undefined, dx: number, dy: number): PackedCellDest | undefined {
  if (!dest) return undefined
  return { x: dest.x + dx, y: dest.y + dy }
}

function applyPackedLongSideCap(layout: PackedCanvasLayout): PackedCanvasLayout {
  const longSide = Math.max(layout.width, layout.height)
  if (longSide <= PACKED_LONG_SIDE_CAP) return layout
  const scale = PACKED_LONG_SIDE_CAP / longSide
  return {
    width: Math.max(1, Math.round(layout.width * scale)),
    height: Math.max(1, Math.round(layout.height * scale)),
    cellSize: Math.max(1, Math.round(layout.cellSize * scale)),
    hole: scaleRect(layout.hole, scale),
    left: scaleDest(layout.left, scale),
    right: scaleDest(layout.right, scale),
    up: scaleDest(layout.up, scale),
    down: scaleDest(layout.down, scale),
  }
}

function scaleRect(rect: PackedCropRect, scale: number): PackedCropRect {
  return {
    x: Math.round(rect.x * scale),
    y: Math.round(rect.y * scale),
    width: Math.max(1, Math.round(rect.width * scale)),
    height: Math.max(1, Math.round(rect.height * scale)),
  }
}

function scaleDest(dest: PackedCellDest | undefined, scale: number): PackedCellDest | undefined {
  if (!dest) return undefined
  return { x: Math.round(dest.x * scale), y: Math.round(dest.y * scale) }
}

function clampCropRect(rect: PackedCropRect, maxWidth: number, maxHeight: number): PackedCropRect {
  const x = Math.min(Math.max(0, rect.x), Math.max(0, maxWidth - 1))
  const y = Math.min(Math.max(0, rect.y), Math.max(0, maxHeight - 1))
  const width = Math.min(rect.width, maxWidth - x)
  const height = Math.min(rect.height, maxHeight - y)
  return { x, y, width: Math.max(1, width), height: Math.max(1, height) }
}
