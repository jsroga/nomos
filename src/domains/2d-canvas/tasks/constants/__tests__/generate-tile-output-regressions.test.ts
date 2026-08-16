import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import {
  packedCanvasLayout,
  packedCropSpecFromLayout,
  tightPackedCanvasLayout,
} from '@/shared/ai/context-pack-layout'
import { BufferEncoding, SharpFit } from '@/shared/data/constants/protocol'
import { packedCropFromContext, TILE_CROP_SIZE } from '../generate-tile'
import {
  assertTilePngSize,
  cropPackedHole,
  PackedCropError,
  toTilePngBase64,
  toTilePngBuffer,
} from '../generate-tile-output'

const GREY = { r: 128, g: 128, b: 128, alpha: 1 }
const LEFT = { r: 20, g: 180, b: 40, alpha: 1 }
const TOP = { r: 200, g: 40, b: 20, alpha: 1 }
const BOTTOM = { r: 40, g: 40, b: 220, alpha: 1 }
const UP = { r: 240, g: 200, b: 20, alpha: 1 }
const BLACK = { r: 0, g: 0, b: 0, alpha: 1 }

const LEFT_ONLY = { left: true, right: false, up: false, down: false }
const DOWN_ONLY = { left: false, right: false, up: false, down: true }
const UP_ONLY = { left: false, right: false, up: true, down: false }

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

async function stripedTile(
  top: { r: number; g: number; b: number; alpha: number },
  bottom: { r: number; g: number; b: number; alpha: number },
): Promise<Buffer> {
  const topBand = await solidPng(TILE_CROP_SIZE, TILE_CROP_SIZE / 2, top)
  const bottomBand = await solidPng(TILE_CROP_SIZE, TILE_CROP_SIZE / 2, bottom)
  return sharp({
    create: {
      width: TILE_CROP_SIZE,
      height: TILE_CROP_SIZE,
      channels: 4,
      background: top,
    },
  })
    .composite([
      { input: topBand, left: 0, top: 0 },
      { input: bottomBand, left: 0, top: TILE_CROP_SIZE / 2 },
    ])
    .png()
    .toBuffer()
}

async function packLeftStriped(): Promise<Buffer> {
  const neighbor = await solidPng(TILE_CROP_SIZE, TILE_CROP_SIZE, LEFT)
  const hole = await stripedTile(TOP, BOTTOM)
  return sharp({
    create: { width: 1024, height: 512, channels: 4, background: BLACK },
  })
    .composite([
      { input: neighbor, left: 0, top: 0 },
      { input: hole, left: 512, top: 0 },
    ])
    .png()
    .toBuffer()
}

async function packVertical(
  neighborOn: 'up' | 'down',
  hole: Buffer,
): Promise<Buffer> {
  const neighbor = await solidPng(TILE_CROP_SIZE, TILE_CROP_SIZE, UP)
  const neighborTop = neighborOn === 'up' ? 0 : 512
  const holeTop = neighborOn === 'up' ? 512 : 0
  return sharp({
    create: { width: 512, height: 1024, channels: 4, background: BLACK },
  })
    .composite([
      { input: neighbor, left: 0, top: neighborTop },
      { input: hole, left: 0, top: holeTop },
    ])
    .png()
    .toBuffer()
}

describe('left-only follow-up crop (grey / zoom / offset)', () => {
  it('center-crop of the 1024×512 pack is half neighbor — hole crop is not', async () => {
    const packed = await packLeftStriped()
    const center = await sharp(packed)
      .extract({ left: 256, top: 0, width: TILE_CROP_SIZE, height: TILE_CROP_SIZE })
      .png()
      .toBuffer()
    expect(await pixelAt(center, 0, 0)).toMatchObject({ r: LEFT.r, g: LEFT.g, b: LEFT.b })
    expect(await pixelAt(center, 511, 0)).toMatchObject({ r: TOP.r, g: TOP.g, b: TOP.b })

    const cropped = await cropPackedHole(
      packed,
      packedCropSpecFromLayout(tightPackedCanvasLayout(LEFT_ONLY)),
    )
    expect(await pixelAt(cropped, 0, 0)).toMatchObject({ r: TOP.r, g: TOP.g, b: TOP.b })
    expect(await pixelAt(cropped, 0, 511)).toMatchObject({ r: BOTTOM.r, g: BOTTOM.g, b: BOTTOM.b })
    expect(await pixelAt(cropped, 256, 0)).not.toMatchObject({ r: LEFT.r, g: LEFT.g, b: LEFT.b })
  })

  it('16:9 letterbox keeps hole scale — top stripe stays at y=0', async () => {
    const tight = await packLeftStriped()
    const layout = packedCanvasLayout(LEFT_ONLY)
    const padded = await sharp({
      create: {
        width: layout.width,
        height: layout.height,
        channels: 4,
        background: BLACK,
      },
    })
      .composite([{ input: tight, left: 0, top: layout.hole.y }])
      .png()
      .toBuffer()
    expect(layout.height).toBe(576)
    expect(layout.hole.y).toBe(32)
    expect(await pixelAt(padded, 512, 0)).toMatchObject({ r: BLACK.r, g: BLACK.g, b: BLACK.b })
    const cropped = await cropPackedHole(padded, packedCropSpecFromLayout(layout))
    expect(await pixelAt(cropped, 0, 0)).toMatchObject({ r: TOP.r, g: TOP.g, b: TOP.b })
    expect(await pixelAt(cropped, 0, 511)).toMatchObject({ r: BOTTOM.r, g: BOTTOM.g, b: BOTTOM.b })
  })

  it('stretching the 2:1 pack to 1:1 then contain-crop does not use hole height 1024', async () => {
    const tight = await packLeftStriped()
    const stretched = await sharp(tight)
      .resize(1024, 1024, { fit: SharpFit.Fill, kernel: 'nearest' })
      .png()
      .toBuffer()
    const cropped = await cropPackedHole(
      stretched,
      packedCropSpecFromLayout(tightPackedCanvasLayout(LEFT_ONLY)),
    )
    const meta = await sharp(cropped).metadata()
    expect(meta.width).toBe(TILE_CROP_SIZE)
    expect(meta.height).toBe(TILE_CROP_SIZE)
    expect(await pixelAt(cropped, 0, 0)).not.toMatchObject({ r: LEFT.r, g: LEFT.g, b: LEFT.b })
  })

  it.each([
    { name: 'unfilled grey left-only', fill: GREY },
  ])('$name is rejected', async ({ fill }) => {
    const neighbor = await solidPng(TILE_CROP_SIZE, TILE_CROP_SIZE, LEFT)
    const hole = await solidPng(TILE_CROP_SIZE, TILE_CROP_SIZE, fill)
    const packed = await sharp({
      create: { width: 1024, height: 512, channels: 4, background: BLACK },
    })
      .composite([
        { input: neighbor, left: 0, top: 0 },
        { input: hole, left: 512, top: 0 },
      ])
      .png()
      .toBuffer()
    await expect(
      cropPackedHole(packed, packedCropSpecFromLayout(tightPackedCanvasLayout(LEFT_ONLY))),
    ).rejects.toThrow(PackedCropError.UnfilledGreyHole)
  })
})

describe('vertical follow-up crop', () => {
  it('down-only hole is the top cell, not the neighbor below', async () => {
    const hole = await stripedTile(TOP, BOTTOM)
    const packed = await packVertical('down', hole)
    const cropped = await cropPackedHole(
      packed,
      packedCropSpecFromLayout(tightPackedCanvasLayout(DOWN_ONLY)),
    )
    expect(await pixelAt(cropped, 0, 0)).toMatchObject({ r: TOP.r, g: TOP.g, b: TOP.b })
    expect(await pixelAt(cropped, 256, 256)).not.toMatchObject({ r: UP.r, g: UP.g, b: UP.b })
  })

  it('up-only hole is the bottom cell, not the neighbor above', async () => {
    const hole = await stripedTile(TOP, BOTTOM)
    const packed = await packVertical('up', hole)
    const cropped = await cropPackedHole(
      packed,
      packedCropSpecFromLayout(tightPackedCanvasLayout(UP_ONLY)),
    )
    expect(await pixelAt(cropped, 0, 0)).toMatchObject({ r: TOP.r, g: TOP.g, b: TOP.b })
    expect(await pixelAt(cropped, 0, 511)).toMatchObject({ r: BOTTOM.r, g: BOTTOM.g, b: BOTTOM.b })
  })

  it('9:16 letterbox on down-only is black bars, not grey, and crops the hole', async () => {
    const hole = await stripedTile(TOP, BOTTOM)
    const tight = await packVertical('down', hole)
    const layout = packedCanvasLayout(DOWN_ONLY)
    const padded = await sharp({
      create: {
        width: layout.width,
        height: layout.height,
        channels: 4,
        background: BLACK,
      },
    })
      .composite([{ input: tight, left: layout.hole.x, top: 0 }])
      .png()
      .toBuffer()
    expect(layout.width).toBe(576)
    expect(layout.hole.x).toBe(32)
    expect(await pixelAt(padded, 0, 0)).toMatchObject({ r: BLACK.r, g: BLACK.g, b: BLACK.b })
    const cropped = await cropPackedHole(padded, packedCropSpecFromLayout(layout))
    expect(await pixelAt(cropped, 0, 0)).toMatchObject({ r: TOP.r, g: TOP.g, b: TOP.b })
  })
})

describe('toTilePngBuffer and size guard', () => {
  it('refuses follow-up without packedCrop (no 1024 center-crop)', async () => {
    await expect(toTilePngBuffer(await packLeftStriped(), false)).rejects.toThrow(
      PackedCropError.MissingPackedCrop,
    )
  })

  it('hole-crops when packedCrop is present even if isFirstTile is true', async () => {
    const cropped = await toTilePngBuffer(
      await packLeftStriped(),
      true,
      packedCropSpecFromLayout(tightPackedCanvasLayout(LEFT_ONLY)),
    )
    expect(await pixelAt(cropped, 0, 0)).toMatchObject({ r: TOP.r, g: TOP.g, b: TOP.b })
  })

  it('first tile without packedCrop still becomes 512×512', async () => {
    const tile = await toTilePngBuffer(await solidPng(800, 600, LEFT), true)
    const meta = await sharp(tile).metadata()
    expect(meta.width).toBe(TILE_CROP_SIZE)
    expect(meta.height).toBe(TILE_CROP_SIZE)
  })

  it('assertTilePngSize rejects a wide collage that preview contain would hide', async () => {
    await expect(assertTilePngSize(await packLeftStriped())).rejects.toThrow(
      PackedCropError.NotTileSize,
    )
  })

  it('assertTilePngSize accepts a 512 tile', async () => {
    await expect(assertTilePngSize(await solidPng(512, 512, LEFT))).resolves.toBeUndefined()
  })

  it('toTilePngBase64 returns a 512 PNG', async () => {
    const spec = packedCropSpecFromLayout(tightPackedCanvasLayout(LEFT_ONLY))
    const b64 = await toTilePngBase64(
      (await packLeftStriped()).toString(BufferEncoding.Base64),
      false,
      spec,
    )
    const buffer = Buffer.from(b64, BufferEncoding.Base64)
    await assertTilePngSize(buffer)
    expect(await pixelAt(buffer, 0, 0)).toMatchObject({ r: TOP.r, g: TOP.g, b: TOP.b })
  })
})

describe('packedCropFromContext', () => {
  const cropRect = { x: 512, y: 32, width: 512, height: 512 }

  it.each([
    { name: 'undefined payload', payload: undefined },
    { name: 'missing cropRect', payload: { images: {}, packedWidth: 1024, packedHeight: 576 } },
    { name: 'missing packedWidth', payload: { images: {}, cropRect, packedHeight: 576 } },
    { name: 'missing packedHeight', payload: { images: {}, cropRect, packedWidth: 1024 } },
    { name: 'zero packedWidth', payload: { images: {}, cropRect, packedWidth: 0, packedHeight: 576 } },
  ])('$name yields no spec so follow-up cannot center-crop', ({ payload }) => {
    expect(packedCropFromContext(payload)).toBeUndefined()
  })

  it('returns cropRect and packed size when complete', () => {
    expect(
      packedCropFromContext({
        images: {},
        cropRect,
        packedWidth: 1024,
        packedHeight: 576,
      }),
    ).toEqual({ cropRect, packedWidth: 1024, packedHeight: 576 })
  })
})
