import sharp from 'sharp'
import { BufferEncoding } from '@/shared/data/constants/protocol'
import {
  CENTER_CROP_OFFSET,
  CONTEXT_CANVAS_SIZE,
  FOLLOW_UP_SEAM_BLEND_PX,
  TILE_CROP_SIZE,
} from './generate-tile'
import { downloadTileAsBase64 } from './generate-tile-output'
import { fillWhiteCornerTriangles } from './generate-tile-white-corners'
import {
  PACKED_CANVAS_RGB,
  scaleCropRect,
  type PackedCropSpec,
} from '@/shared/ai/context-pack-layout'
import { FeatureFlag, isFeatureEnabled } from '@/shared/data/constants/feature-flags'

const NEUTRAL_GREY = 128
const NEUTRAL_GREY_TOLERANCE = 12
const PACKED_SKIP_TOLERANCE = 12
const PACKED_EDGE_SAMPLES = 5
const RGBA_CHANNELS = 4

async function resizeToContextCanvas(buffer: Buffer): Promise<Buffer> {
  const meta = await sharp(buffer).metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0
  if (width === CONTEXT_CANVAS_SIZE && height === CONTEXT_CANVAS_SIZE) return buffer
  return sharp(buffer)
    .resize(CONTEXT_CANVAS_SIZE, CONTEXT_CANVAS_SIZE, { fit: 'fill' })
    .png()
    .toBuffer()
}

function isNeutralGrey(r: number, g: number, b: number): boolean {
  return (
    Math.abs(r - NEUTRAL_GREY) <= NEUTRAL_GREY_TOLERANCE &&
    Math.abs(g - NEUTRAL_GREY) <= NEUTRAL_GREY_TOLERANCE &&
    Math.abs(b - NEUTRAL_GREY) <= NEUTRAL_GREY_TOLERANCE
  )
}

function isPackedSkipPixel(r: number, g: number, b: number): boolean {
  if (isNeutralGrey(r, g, b)) return true
  return (
    Math.abs(r - PACKED_CANVAS_RGB.r) <= PACKED_SKIP_TOLERANCE &&
    Math.abs(g - PACKED_CANVAS_RGB.g) <= PACKED_SKIP_TOLERANCE &&
    Math.abs(b - PACKED_CANVAS_RGB.b) <= PACKED_SKIP_TOLERANCE
  )
}

async function readPixel(
  context: Buffer,
  x: number,
  y: number,
): Promise<{ r: number; g: number; b: number }> {
  const { data } = await sharp(context)
    .extract({ left: x, top: y, width: 1, height: 1 })
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { r: data[0] ?? 0, g: data[1] ?? 0, b: data[2] ?? 0 }
}

async function contextStripHasNeighbor(
  context: Buffer,
  left: number,
  top: number,
): Promise<boolean> {
  const pixel = await readPixel(context, left, top)
  return !isNeutralGrey(pixel.r, pixel.g, pixel.b)
}

async function packedStripHasNeighbor(
  context: Buffer,
  left: number,
  top: number,
  width: number,
  height: number,
): Promise<boolean> {
  let hits = 0
  for (let i = 0; i < PACKED_EDGE_SAMPLES; i += 1) {
    const t = (i + 1) / (PACKED_EDGE_SAMPLES + 1)
    const x = left + Math.min(width - 1, Math.floor(width * t))
    const y = top + Math.min(height - 1, Math.floor(height * t))
    const pixel = await readPixel(context, x, y)
    if (!isPackedSkipPixel(pixel.r, pixel.g, pixel.b)) hits += 1
  }
  return hits * 2 >= PACKED_EDGE_SAMPLES
}

async function tileRawRgba(buffer: Buffer): Promise<Buffer> {
  const { data } = await sharp(buffer)
    .resize(TILE_CROP_SIZE, TILE_CROP_SIZE, { fit: 'cover' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return Buffer.from(data)
}

function mixChannel(neighbor: number, generated: number, generatedWeight: number): number {
  return Math.round(neighbor * (1 - generatedWeight) + generated * generatedWeight)
}

function generatedWeightOnSeam(offset: number, seamAtStart: boolean): number {
  const last = FOLLOW_UP_SEAM_BLEND_PX - 1
  if (last <= 0) return 1
  return seamAtStart ? offset / last : (last - offset) / last
}

async function readContextColumn(context: Buffer, x: number): Promise<Buffer> {
  const { data } = await sharp(context)
    .extract({
      left: x,
      top: CENTER_CROP_OFFSET,
      width: 1,
      height: TILE_CROP_SIZE,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return Buffer.from(data)
}

async function readContextRow(context: Buffer, y: number): Promise<Buffer> {
  const { data } = await sharp(context)
    .extract({
      left: CENTER_CROP_OFFSET,
      top: y,
      width: TILE_CROP_SIZE,
      height: 1,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return Buffer.from(data)
}

function mixTileFromEdge(
  tileRgba: Buffer,
  edge: Buffer,
  horizontal: boolean,
  seamAtStart: boolean,
): void {
  for (let a = 0; a < TILE_CROP_SIZE; a += 1) {
    for (let b = 0; b < FOLLOW_UP_SEAM_BLEND_PX; b += 1) {
      const generatedWeight = generatedWeightOnSeam(b, seamAtStart)
      const tileX = horizontal ? a : seamAtStart ? b : TILE_CROP_SIZE - FOLLOW_UP_SEAM_BLEND_PX + b
      const tileY = horizontal ? (seamAtStart ? b : TILE_CROP_SIZE - FOLLOW_UP_SEAM_BLEND_PX + b) : a
      const ei = a * RGBA_CHANNELS
      const ti = (tileY * TILE_CROP_SIZE + tileX) * RGBA_CHANNELS
      tileRgba[ti] = mixChannel(edge[ei] ?? 0, tileRgba[ti] ?? 0, generatedWeight)
      tileRgba[ti + 1] = mixChannel(edge[ei + 1] ?? 0, tileRgba[ti + 1] ?? 0, generatedWeight)
      tileRgba[ti + 2] = mixChannel(edge[ei + 2] ?? 0, tileRgba[ti + 2] ?? 0, generatedWeight)
    }
  }
}

async function blendVerticalSeam(
  tileRgba: Buffer,
  context: Buffer,
  fromLeft: boolean,
): Promise<void> {
  const innerX = fromLeft ? CENTER_CROP_OFFSET - 1 : CENTER_CROP_OFFSET + TILE_CROP_SIZE
  if (!(await contextStripHasNeighbor(context, innerX, CENTER_CROP_OFFSET + 1))) return
  mixTileFromEdge(tileRgba, await readContextColumn(context, innerX), false, fromLeft)
}

async function blendHorizontalSeam(
  tileRgba: Buffer,
  context: Buffer,
  fromTop: boolean,
): Promise<void> {
  const innerY = fromTop ? CENTER_CROP_OFFSET - 1 : CENTER_CROP_OFFSET + TILE_CROP_SIZE
  if (!(await contextStripHasNeighbor(context, CENTER_CROP_OFFSET + 1, innerY))) return
  mixTileFromEdge(tileRgba, await readContextRow(context, innerY), true, fromTop)
}

async function packedHoleRect(context: Buffer, spec: PackedCropSpec) {
  const meta = await sharp(context).metadata()
  return scaleCropRect(
    spec.cropRect,
    spec.packedWidth,
    spec.packedHeight,
    meta.width ?? spec.packedWidth,
    meta.height ?? spec.packedHeight,
  )
}

async function readPackedColumn(
  context: Buffer,
  x: number,
  y: number,
  height: number,
): Promise<Buffer> {
  const { data } = await sharp(context)
    .extract({ left: x, top: y, width: 1, height })
    .resize(1, TILE_CROP_SIZE, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return Buffer.from(data)
}

async function readPackedRow(
  context: Buffer,
  x: number,
  y: number,
  width: number,
): Promise<Buffer> {
  const { data } = await sharp(context)
    .extract({ left: x, top: y, width, height: 1 })
    .resize(TILE_CROP_SIZE, 1, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return Buffer.from(data)
}

async function blendPackedVerticalSeam(
  tileRgba: Buffer,
  context: Buffer,
  spec: PackedCropSpec,
  fromLeft: boolean,
): Promise<void> {
  const hole = await packedHoleRect(context, spec)
  const meta = await sharp(context).metadata()
  const width = meta.width ?? 0
  const x = fromLeft ? hole.x - 1 : hole.x + hole.width
  if (x < 0 || x >= width) return
  if (!(await packedStripHasNeighbor(context, x, hole.y, 1, hole.height))) return
  mixTileFromEdge(tileRgba, await readPackedColumn(context, x, hole.y, hole.height), false, fromLeft)
}

async function blendPackedHorizontalSeam(
  tileRgba: Buffer,
  context: Buffer,
  spec: PackedCropSpec,
  fromTop: boolean,
): Promise<void> {
  const hole = await packedHoleRect(context, spec)
  const meta = await sharp(context).metadata()
  const height = meta.height ?? 0
  const y = fromTop ? hole.y - 1 : hole.y + hole.height
  if (y < 0 || y >= height) return
  if (!(await packedStripHasNeighbor(context, hole.x, y, hole.width, 1))) return
  mixTileFromEdge(tileRgba, await readPackedRow(context, hole.x, y, hole.width), true, fromTop)
}

async function pngFromTileRgba(tileRgba: Buffer): Promise<Buffer> {
  return sharp(tileRgba, {
    raw: { width: TILE_CROP_SIZE, height: TILE_CROP_SIZE, channels: RGBA_CHANNELS },
  })
    .png()
    .toBuffer()
}

async function blendPackedFollowUpSeams(
  tile: Buffer,
  contextPng: Buffer,
  packedCrop: PackedCropSpec,
): Promise<Buffer> {
  const tileRgba = await tileRawRgba(tile)
  await blendPackedVerticalSeam(tileRgba, contextPng, packedCrop, true)
  await blendPackedVerticalSeam(tileRgba, contextPng, packedCrop, false)
  await blendPackedHorizontalSeam(tileRgba, contextPng, packedCrop, true)
  await blendPackedHorizontalSeam(tileRgba, contextPng, packedCrop, false)
  return pngFromTileRgba(tileRgba)
}

/** Fade neighbor edge color onto a generated 512 tile without duplicating neighbor pixels. */
export async function blendFollowUpSeams(
  tile: Buffer,
  contextPng: Buffer,
  packedCrop?: PackedCropSpec,
): Promise<Buffer> {
  if (packedCrop) return blendPackedFollowUpSeams(tile, contextPng, packedCrop)
  const context = await resizeToContextCanvas(contextPng)
  const tileRgba = await tileRawRgba(tile)
  await blendVerticalSeam(tileRgba, context, true)
  await blendVerticalSeam(tileRgba, context, false)
  await blendHorizontalSeam(tileRgba, context, true)
  await blendHorizontalSeam(tileRgba, context, false)
  return pngFromTileRgba(tileRgba)
}

export async function blendFollowUpSeamsFromBase64(
  tileBase64: string,
  contextBase64: string,
  packedCrop?: PackedCropSpec,
): Promise<string> {
  const comma = contextBase64.indexOf(',')
  const rawContext = comma >= 0 ? contextBase64.slice(comma + 1) : contextBase64
  const blended = await blendFollowUpSeams(
    Buffer.from(tileBase64, BufferEncoding.Base64),
    Buffer.from(rawContext, BufferEncoding.Base64),
    packedCrop,
  )
  return blended.toString(BufferEncoding.Base64)
}

/** Cover-resize the model output to 512, fill white corners, then color-match follow-up seams. */
export async function downloadTileWithFollowUpSeams(
  imageUrl: string,
  isFirstTile: boolean,
  contextImageBase64: string | undefined,
  packedCrop?: PackedCropSpec,
): Promise<string> {
  const downloaded = await downloadTileAsBase64(imageUrl, isFirstTile, packedCrop)
  const filled = await fillWhiteCornerTriangles(
    Buffer.from(downloaded, BufferEncoding.Base64),
  )
  const tile = filled.toString(BufferEncoding.Base64)
  if (isFirstTile || !contextImageBase64) return tile
  if (!isFeatureEnabled(FeatureFlag.TileSeamColorFade)) return tile
  return blendFollowUpSeamsFromBase64(tile, contextImageBase64, packedCrop)
}
