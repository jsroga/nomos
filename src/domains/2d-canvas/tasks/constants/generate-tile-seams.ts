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

const NEUTRAL_GREY = 128
const NEUTRAL_GREY_TOLERANCE = 12
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

async function contextStripHasNeighbor(
  context: Buffer,
  left: number,
  top: number,
): Promise<boolean> {
  const { data } = await sharp(context)
    .extract({ left, top, width: 1, height: 1 })
    .raw()
    .toBuffer({ resolveWithObject: true })
  return !isNeutralGrey(data[0] ?? 0, data[1] ?? 0, data[2] ?? 0)
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

/** Color-match the seam using the neighbor's last column only — never copy a strip of buildings. */
async function blendVerticalSeam(
  tileRgba: Buffer,
  context: Buffer,
  fromLeft: boolean,
): Promise<void> {
  const innerX = fromLeft ? CENTER_CROP_OFFSET - 1 : CENTER_CROP_OFFSET + TILE_CROP_SIZE
  if (!(await contextStripHasNeighbor(context, innerX, CENTER_CROP_OFFSET + 1))) return
  const edge = await readContextColumn(context, innerX)
  for (let y = 0; y < TILE_CROP_SIZE; y += 1) {
    for (let x = 0; x < FOLLOW_UP_SEAM_BLEND_PX; x += 1) {
      const generatedWeight = generatedWeightOnSeam(x, fromLeft)
      const tileX = fromLeft ? x : TILE_CROP_SIZE - FOLLOW_UP_SEAM_BLEND_PX + x
      const ei = y * RGBA_CHANNELS
      const ti = (y * TILE_CROP_SIZE + tileX) * RGBA_CHANNELS
      tileRgba[ti] = mixChannel(edge[ei] ?? 0, tileRgba[ti] ?? 0, generatedWeight)
      tileRgba[ti + 1] = mixChannel(edge[ei + 1] ?? 0, tileRgba[ti + 1] ?? 0, generatedWeight)
      tileRgba[ti + 2] = mixChannel(edge[ei + 2] ?? 0, tileRgba[ti + 2] ?? 0, generatedWeight)
    }
  }
}

async function blendHorizontalSeam(
  tileRgba: Buffer,
  context: Buffer,
  fromTop: boolean,
): Promise<void> {
  const innerY = fromTop ? CENTER_CROP_OFFSET - 1 : CENTER_CROP_OFFSET + TILE_CROP_SIZE
  if (!(await contextStripHasNeighbor(context, CENTER_CROP_OFFSET + 1, innerY))) return
  const edge = await readContextRow(context, innerY)
  for (let y = 0; y < FOLLOW_UP_SEAM_BLEND_PX; y += 1) {
    for (let x = 0; x < TILE_CROP_SIZE; x += 1) {
      const generatedWeight = generatedWeightOnSeam(y, fromTop)
      const tileY = fromTop ? y : TILE_CROP_SIZE - FOLLOW_UP_SEAM_BLEND_PX + y
      const ei = x * RGBA_CHANNELS
      const ti = (tileY * TILE_CROP_SIZE + x) * RGBA_CHANNELS
      tileRgba[ti] = mixChannel(edge[ei] ?? 0, tileRgba[ti] ?? 0, generatedWeight)
      tileRgba[ti + 1] = mixChannel(edge[ei + 1] ?? 0, tileRgba[ti + 1] ?? 0, generatedWeight)
      tileRgba[ti + 2] = mixChannel(edge[ei + 2] ?? 0, tileRgba[ti + 2] ?? 0, generatedWeight)
    }
  }
}

/** Fade neighbor edge color onto a generated 512 tile without duplicating neighbor pixels. */
export async function blendFollowUpSeams(tile: Buffer, contextPng: Buffer): Promise<Buffer> {
  const context = await resizeToContextCanvas(contextPng)
  const tileRgba = await tileRawRgba(tile)
  await blendVerticalSeam(tileRgba, context, true)
  await blendVerticalSeam(tileRgba, context, false)
  await blendHorizontalSeam(tileRgba, context, true)
  await blendHorizontalSeam(tileRgba, context, false)
  return sharp(tileRgba, {
    raw: { width: TILE_CROP_SIZE, height: TILE_CROP_SIZE, channels: RGBA_CHANNELS },
  })
    .png()
    .toBuffer()
}

export async function blendFollowUpSeamsFromBase64(
  tileBase64: string,
  contextBase64: string,
): Promise<string> {
  const comma = contextBase64.indexOf(',')
  const rawContext = comma >= 0 ? contextBase64.slice(comma + 1) : contextBase64
  const blended = await blendFollowUpSeams(
    Buffer.from(tileBase64, BufferEncoding.Base64),
    Buffer.from(rawContext, BufferEncoding.Base64),
  )
  return blended.toString(BufferEncoding.Base64)
}

/** Cover-resize the model output to 512, fill white corners, then color-match follow-up seams. */
export async function downloadTileWithFollowUpSeams(
  imageUrl: string,
  isFirstTile: boolean,
  contextImageBase64: string | undefined,
): Promise<string> {
  const downloaded = await downloadTileAsBase64(imageUrl, true)
  const filled = await fillWhiteCornerTriangles(
    Buffer.from(downloaded, BufferEncoding.Base64),
  )
  const tile = filled.toString(BufferEncoding.Base64)
  if (isFirstTile || !contextImageBase64) return tile
  return blendFollowUpSeamsFromBase64(tile, contextImageBase64)
}
