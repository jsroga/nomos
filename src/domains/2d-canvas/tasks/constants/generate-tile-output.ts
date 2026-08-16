import sharp from 'sharp'
import { BufferEncoding } from '@/shared/data/constants/protocol'
import {
  CENTER_CROP_OFFSET,
  CONTEXT_CANVAS_SIZE,
  TILE_CROP_SIZE,
} from './generate-tile'

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

async function cropFollowUpTile(buffer: Buffer): Promise<Buffer> {
  const meta = await sharp(buffer).metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0
  if (width === TILE_CROP_SIZE && height === TILE_CROP_SIZE) return buffer
  const canvas = await resizeToContextCanvas(buffer)
  return sharp(canvas)
    .extract({
      left: CENTER_CROP_OFFSET,
      top: CENTER_CROP_OFFSET,
      width: TILE_CROP_SIZE,
      height: TILE_CROP_SIZE,
    })
    .png()
    .toBuffer()
}

const MASK_PRESERVE = { r: 0, g: 0, b: 0, alpha: 1 }
const MASK_EDIT = { r: 255, g: 255, b: 255, alpha: 1 }

/** White = generate (center 512). Black = keep neighbor edge strips. */
export async function buildCenterHoleMaskPng(): Promise<Buffer> {
  const hole = await sharp({
    create: {
      width: TILE_CROP_SIZE,
      height: TILE_CROP_SIZE,
      channels: 4,
      background: MASK_EDIT,
    },
  })
    .png()
    .toBuffer()
  return sharp({
    create: {
      width: CONTEXT_CANVAS_SIZE,
      height: CONTEXT_CANVAS_SIZE,
      channels: 4,
      background: MASK_PRESERVE,
    },
  })
    .composite([{ input: hole, left: CENTER_CROP_OFFSET, top: CENTER_CROP_OFFSET }])
    .png()
    .toBuffer()
}

async function resizeFirstTile(buffer: Buffer): Promise<Buffer> {
  const meta = await sharp(buffer).metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0
  if (width === TILE_CROP_SIZE && height === TILE_CROP_SIZE) return buffer
  return sharp(buffer)
    .resize(TILE_CROP_SIZE, TILE_CROP_SIZE, { fit: 'cover' })
    .png()
    .toBuffer()
}

/** First tile: cover-resize to 512. Follow-up: extract the center 512 of the 1024 context canvas. */
export async function toTilePngBuffer(buffer: Buffer, isFirstTile: boolean): Promise<Buffer> {
  return isFirstTile ? resizeFirstTile(buffer) : cropFollowUpTile(buffer)
}

export async function toTilePngBase64(imageData: string, isFirstTile: boolean): Promise<string> {
  const buffer = await toTilePngBuffer(Buffer.from(imageData, BufferEncoding.Base64), isFirstTile)
  return buffer.toString(BufferEncoding.Base64)
}

export async function downloadTileAsBase64(
  imageUrl: string,
  isFirstTile: boolean,
): Promise<string> {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to download Apiframe tile image: ${response.status}`)
  }
  const buffer = await toTilePngBuffer(Buffer.from(await response.arrayBuffer()), isFirstTile)
  return buffer.toString(BufferEncoding.Base64)
}
