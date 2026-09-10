import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { cropPackedHole, PackedCropError, toTilePngBuffer } from '../generate-tile-output'
import { TILE_CROP_SIZE } from '../generate-tile'
import { packedCanvasLayout, packedCropSpecFromLayout, tightPackedCanvasLayout } from '@/shared/ai/context-pack-layout'
import { SharpFit } from '@/shared/data/constants/protocol'

const GREY = { r: 128, g: 128, b: 128, alpha: 1 }
const LEFT = { r: 20, g: 180, b: 40, alpha: 1 }
const HOLE = { r: 200, g: 40, b: 20, alpha: 1 }
const RIGHT = { r: 40, g: 40, b: 220, alpha: 1 }

async function solidPng(
  width: number,
  height: number,
  background: { r: number; g: number; b: number; alpha: number },
): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 4, background } })
    .png()
    .toBuffer()
}

async function pixelAt(
  buffer: Buffer,
  x: number,
  y: number,
): Promise<{ r: number; g: number; b: number }> {
  const { data } = await sharp(buffer)
    .extract({ left: x, top: y, width: 1, height: 1 })
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { r: data[0] ?? 0, g: data[1] ?? 0, b: data[2] ?? 0 }
}

async function leftOnlyPacked(holeFill = GREY): Promise<Buffer> {
  const neighbor = await solidPng(512, 512, LEFT)
  const hole = await solidPng(512, 512, holeFill)
  return sharp({
    create: { width: 1024, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
  })
    .composite([
      { input: neighbor, left: 0, top: 0 },
      { input: hole, left: 512, top: 0 },
    ])
    .png()
    .toBuffer()
}

async function leftHoleRightPacked(holeFill = HOLE): Promise<Buffer> {
  const left = await solidPng(512, 512, LEFT)
  const hole = await solidPng(512, 512, holeFill)
  const right = await solidPng(512, 512, RIGHT)
  return sharp({
    create: { width: 1536, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
  })
    .composite([
      { input: left, left: 0, top: 0 },
      { input: hole, left: 512, top: 0 },
      { input: right, left: 1024, top: 0 },
    ])
    .png()
    .toBuffer()
}

describe('packed left-only canvas', () => {
  it('keeps grey only inside the hole cell', async () => {
    const packed = await leftOnlyPacked()
    expect(await pixelAt(packed, 0, 0)).toMatchObject({ r: LEFT.r, g: LEFT.g, b: LEFT.b })
    expect(await pixelAt(packed, 511, 0)).toMatchObject({ r: LEFT.r, g: LEFT.g, b: LEFT.b })
    expect(await pixelAt(packed, 512, 0)).toMatchObject({ r: GREY.r, g: GREY.g, b: GREY.b })
    expect(await pixelAt(packed, 1023, 511)).toMatchObject({ r: GREY.r, g: GREY.g, b: GREY.b })
  })
})

describe('cropPackedHole', () => {
  it('extracts the hole of a 1536×512 collage, not a neighbor', async () => {
    const packed = await leftHoleRightPacked()
    const spec = packedCropSpecFromLayout(
      tightPackedCanvasLayout({ left: true, right: true, up: false, down: false }),
    )
    const cropped = await cropPackedHole(packed, spec)
    const meta = await sharp(cropped).metadata()
    expect(meta.width).toBe(TILE_CROP_SIZE)
    expect(meta.height).toBe(TILE_CROP_SIZE)
    expect(await pixelAt(cropped, 0, 0)).toMatchObject({ r: HOLE.r, g: HOLE.g, b: HOLE.b })
    expect(await pixelAt(cropped, 256, 256)).toMatchObject({ r: HOLE.r, g: HOLE.g, b: HOLE.b })
  })

  it('extracts the same hole after a 2× output', async () => {
    const packed = await leftHoleRightPacked()
    const doubled = await sharp(packed)
      .resize(3072, 1024, { fit: SharpFit.Fill, kernel: 'nearest' })
      .png()
      .toBuffer()
    const spec = packedCropSpecFromLayout(
      tightPackedCanvasLayout({ left: true, right: true, up: false, down: false }),
    )
    const cropped = await cropPackedHole(doubled, spec)
    expect(await pixelAt(cropped, 0, 0)).toMatchObject({ r: HOLE.r, g: HOLE.g, b: HOLE.b })
    expect(await pixelAt(cropped, 511, 511)).toMatchObject({ r: HOLE.r, g: HOLE.g, b: HOLE.b })
  })

  it('extracts the right-hand hole of a left-only pack, not the neighbor or the center', async () => {
    const packed = await leftOnlyPacked(HOLE)
    const spec = packedCropSpecFromLayout(
      tightPackedCanvasLayout({ left: true, right: false, up: false, down: false }),
    )
    const cropped = await toTilePngBuffer(packed, false, spec)
    const meta = await sharp(cropped).metadata()
    expect(meta.width).toBe(TILE_CROP_SIZE)
    expect(meta.height).toBe(TILE_CROP_SIZE)
    expect(await pixelAt(cropped, 0, 0)).toMatchObject({ r: HOLE.r, g: HOLE.g, b: HOLE.b })
    expect(await pixelAt(cropped, 511, 511)).toMatchObject({ r: HOLE.r, g: HOLE.g, b: HOLE.b })
  })

  it('hole-crops a left-only pack even if isFirstTile is set', async () => {
    const packed = await leftOnlyPacked(HOLE)
    const spec = packedCropSpecFromLayout(
      tightPackedCanvasLayout({ left: true, right: false, up: false, down: false }),
    )
    const cropped = await toTilePngBuffer(packed, true, spec)
    expect(await pixelAt(cropped, 0, 0)).toMatchObject({ r: HOLE.r, g: HOLE.g, b: HOLE.b })
  })

  it('extracts the hole from a downscaled left-only pack instead of keeping the whole 512', async () => {
    const packed = await leftOnlyPacked(HOLE)
    const spec = packedCropSpecFromLayout(
      tightPackedCanvasLayout({ left: true, right: false, up: false, down: false }),
    )
    const downscaled = await sharp(packed)
      .resize(TILE_CROP_SIZE, TILE_CROP_SIZE, { fit: SharpFit.Fill, kernel: 'nearest' })
      .png()
      .toBuffer()
    const cropped = await cropPackedHole(downscaled, spec)
    expect(await pixelAt(cropped, 0, 0)).toMatchObject({ r: HOLE.r, g: HOLE.g, b: HOLE.b })
    expect(await pixelAt(cropped, 511, 511)).toMatchObject({ r: HOLE.r, g: HOLE.g, b: HOLE.b })
  })

  it('refuses a 512 tile that is still the grey hole', async () => {
    const grey = await solidPng(TILE_CROP_SIZE, TILE_CROP_SIZE, GREY)
    const spec = packedCropSpecFromLayout(
      tightPackedCanvasLayout({ left: true, right: false, up: false, down: false }),
    )
    await expect(cropPackedHole(grey, spec)).rejects.toThrow(PackedCropError.UnfilledGreyHole)
  })

  it('extracts the hole after 16:9 letterbox on a left-only pack', async () => {
    const tight = await leftOnlyPacked(HOLE)
    const layout = packedCanvasLayout({ left: true, right: false, up: false, down: false })
    const padded = await sharp({
      create: {
        width: layout.width,
        height: layout.height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      },
    })
      .composite([{ input: tight, left: 0, top: layout.hole.y }])
      .png()
      .toBuffer()
    const cropped = await cropPackedHole(padded, packedCropSpecFromLayout(layout))
    expect(await pixelAt(cropped, 0, 0)).toMatchObject({ r: HOLE.r, g: HOLE.g, b: HOLE.b })
    expect(await pixelAt(cropped, 256, 256)).toMatchObject({ r: HOLE.r, g: HOLE.g, b: HOLE.b })
  })

  it('refuses a crop that is still the unfilled grey hole', async () => {
    const packed = await leftHoleRightPacked(GREY)
    const spec = packedCropSpecFromLayout(
      tightPackedCanvasLayout({ left: true, right: true, up: false, down: false }),
    )
    await expect(cropPackedHole(packed, spec)).rejects.toThrow(PackedCropError.UnfilledGreyHole)
  })

  it('refuses follow-up without packedCrop instead of center-cropping grey into the tile', async () => {
    const packed = await leftOnlyPacked()
    await expect(toTilePngBuffer(packed, false)).rejects.toThrow(PackedCropError.MissingPackedCrop)
  })
})
