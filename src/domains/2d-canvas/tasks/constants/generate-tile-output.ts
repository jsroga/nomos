import sharp from 'sharp'
import { BufferEncoding, SharpFit } from '@/shared/data/constants/protocol'
import type { PackedCropSpec } from '@/shared/ai/context-pack-layout'
import { PACKED_HOLE_RGB, scaleCropRect } from '@/shared/ai/context-pack-layout'
import {
  TILE_CROP_SIZE,
} from './generate-tile'

export enum PackedCropError {
  UnfilledGreyHole =
    'Follow-up crop is still the grey hole — the model did not paint the missing tile',
  MissingPackedCrop = 'Follow-up tile is missing packedCrop; refusing center-crop',
  NotTileSize = 'Follow-up result is not a 512×512 tile',
}

const UNFILLED_GREY_RATIO = 0.35
const GREY_CHANNEL_TOLERANCE = 2

async function resizeFirstTile(buffer: Buffer): Promise<Buffer> {
  const meta = await sharp(buffer).metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0
  if (width === TILE_CROP_SIZE && height === TILE_CROP_SIZE) return buffer
  return sharp(buffer)
    .resize(TILE_CROP_SIZE, TILE_CROP_SIZE, { fit: SharpFit.Cover })
    .png()
    .toBuffer()
}

/** Scale cropRect to the model output with uniform contain-fit, extract the hole, resize to 512. */
export async function cropPackedHole(
  buffer: Buffer,
  spec: PackedCropSpec,
): Promise<Buffer> {
  const meta = await sharp(buffer).metadata()
  const outWidth = meta.width ?? 0
  const outHeight = meta.height ?? 0
  const hole = scaleCropRect(
    spec.cropRect,
    spec.packedWidth,
    spec.packedHeight,
    outWidth,
    outHeight,
  )
  const extracted = await sharp(buffer)
    .extract({
      left: hole.x,
      top: hole.y,
      width: hole.width,
      height: hole.height,
    })
    .png()
    .toBuffer()
  await assertHoleIsPainted(extracted)
  const extractedMeta = await sharp(extracted).metadata()
  if (extractedMeta.width === TILE_CROP_SIZE && extractedMeta.height === TILE_CROP_SIZE) {
    return extracted
  }
  return sharp(extracted)
    .resize(TILE_CROP_SIZE, TILE_CROP_SIZE, { fit: SharpFit.Fill })
    .png()
    .toBuffer()
}

async function assertHoleIsPainted(buffer: Buffer): Promise<void> {
  const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true })
  const pixelCount = info.width * info.height
  if (pixelCount === 0) throw new Error(PackedCropError.UnfilledGreyHole)
  const step = info.channels
  let grey = 0
  for (let i = 0; i < data.length; i += step) {
    if (isPackedHoleGrey(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0)) grey += 1
  }
  if (grey / pixelCount >= UNFILLED_GREY_RATIO) {
    throw new Error(PackedCropError.UnfilledGreyHole)
  }
}

function isPackedHoleGrey(r: number, g: number, b: number): boolean {
  return (
    Math.abs(r - PACKED_HOLE_RGB.r) <= GREY_CHANNEL_TOLERANCE &&
    Math.abs(g - PACKED_HOLE_RGB.g) <= GREY_CHANNEL_TOLERANCE &&
    Math.abs(b - PACKED_HOLE_RGB.b) <= GREY_CHANNEL_TOLERANCE
  )
}

export async function assertTilePngSize(buffer: Buffer): Promise<void> {
  const meta = await sharp(buffer).metadata()
  if (meta.width !== TILE_CROP_SIZE || meta.height !== TILE_CROP_SIZE) {
    throw new Error(PackedCropError.NotTileSize)
  }
}

export async function toTilePngBuffer(
  buffer: Buffer,
  isFirstTile: boolean,
  packedCrop?: PackedCropSpec,
): Promise<Buffer> {
  if (packedCrop) {
    const tile = await cropPackedHole(buffer, packedCrop)
    await assertTilePngSize(tile)
    return tile
  }
  if (!isFirstTile) throw new Error(PackedCropError.MissingPackedCrop)
  const tile = await resizeFirstTile(buffer)
  await assertTilePngSize(tile)
  return tile
}

export async function toTilePngBase64(
  imageData: string,
  isFirstTile: boolean,
  packedCrop?: PackedCropSpec,
): Promise<string> {
  const buffer = await toTilePngBuffer(
    Buffer.from(imageData, BufferEncoding.Base64),
    isFirstTile,
    packedCrop,
  )
  return buffer.toString(BufferEncoding.Base64)
}

export async function downloadTileAsBase64(
  imageUrl: string,
  isFirstTile: boolean,
  packedCrop?: PackedCropSpec,
): Promise<string> {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to download Apiframe tile image: ${response.status}`)
  }
  const buffer = await toTilePngBuffer(
    Buffer.from(await response.arrayBuffer()),
    isFirstTile,
    packedCrop,
  )
  return buffer.toString(BufferEncoding.Base64)
}
