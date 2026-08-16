import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { toTilePngBuffer, buildCenterHoleMaskPng } from '../generate-tile-output'
import { CENTER_CROP_OFFSET, CONTEXT_CANVAS_SIZE, TILE_CROP_SIZE } from '../generate-tile'

const GREY = { r: 128, g: 128, b: 128, alpha: 1 }
const FILL = { r: 200, g: 40, b: 20, alpha: 1 }

async function contextCanvasWithFilledCenter(): Promise<Buffer> {
  const center = await sharp({
    create: { width: 512, height: 512, channels: 4, background: FILL },
  })
    .png()
    .toBuffer()
  return sharp({
    create: { width: 1024, height: 1024, channels: 4, background: GREY },
  })
    .composite([{ input: center, left: 256, top: 256 }])
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

describe('toTilePngBuffer', () => {
  it('extracts the center 512 of a follow-up context canvas', async () => {
    const cropped = await toTilePngBuffer(await contextCanvasWithFilledCenter(), false)
    const meta = await sharp(cropped).metadata()
    expect(meta.width).toBe(TILE_CROP_SIZE)
    expect(meta.height).toBe(TILE_CROP_SIZE)
    expect(await pixelAt(cropped, 0, 0)).toMatchObject({ r: FILL.r, g: FILL.g, b: FILL.b })
    expect(await pixelAt(cropped, 256, 256)).toMatchObject({ r: FILL.r, g: FILL.g, b: FILL.b })
  })

  it('does not keep the grey context margins that cover-resize would leave', async () => {
    const canvas = await contextCanvasWithFilledCenter()
    const cover = await toTilePngBuffer(canvas, true)
    const cropped = await toTilePngBuffer(canvas, false)
    expect(await pixelAt(cover, 0, 0)).toMatchObject({ r: GREY.r, g: GREY.g, b: GREY.b })
    expect(await pixelAt(cropped, 0, 0)).toMatchObject({ r: FILL.r, g: FILL.g, b: FILL.b })
  })

  it('leaves an already-512 follow-up result uncropped', async () => {
    const tile = await sharp({
      create: { width: TILE_CROP_SIZE, height: TILE_CROP_SIZE, channels: 4, background: FILL },
    })
      .png()
      .toBuffer()
    const out = await toTilePngBuffer(tile, false)
    expect(await pixelAt(out, 0, 0)).toMatchObject({ r: FILL.r, g: FILL.g, b: FILL.b })
  })
})

describe('buildCenterHoleMaskPng', () => {
  it('whites the center 512 and blacks the neighbor strips', async () => {
    const mask = await buildCenterHoleMaskPng()
    const meta = await sharp(mask).metadata()
    expect(meta.width).toBe(CONTEXT_CANVAS_SIZE)
    expect(meta.height).toBe(CONTEXT_CANVAS_SIZE)
    expect(await pixelAt(mask, 0, CENTER_CROP_OFFSET)).toMatchObject({ r: 0, g: 0, b: 0 })
    expect(await pixelAt(mask, CENTER_CROP_OFFSET, CENTER_CROP_OFFSET)).toMatchObject({
      r: 255,
      g: 255,
      b: 255,
    })
    expect(
      await pixelAt(mask, CENTER_CROP_OFFSET - 1, CENTER_CROP_OFFSET),
    ).toMatchObject({ r: 0, g: 0, b: 0 })
  })
})
