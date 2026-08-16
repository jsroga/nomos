import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { fillWhiteCornerTriangles } from '../generate-tile-white-corners'
import { TILE_CROP_SIZE } from '../generate-tile'

const FILL = { r: 40, g: 80, b: 200, alpha: 1 }
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }

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

describe('fillWhiteCornerTriangles', () => {
  it('cover-fills a centered content square that left white corners', async () => {
    const inner = await sharp({
      create: { width: 300, height: 300, channels: 4, background: FILL },
    })
      .png()
      .toBuffer()
    const tile = await sharp({
      create: { width: TILE_CROP_SIZE, height: TILE_CROP_SIZE, channels: 4, background: WHITE },
    })
      .composite([{ input: inner, left: 106, top: 106 }])
      .png()
      .toBuffer()
    const out = await fillWhiteCornerTriangles(tile)
    const meta = await sharp(out).metadata()
    expect(meta.width).toBe(TILE_CROP_SIZE)
    expect(meta.height).toBe(TILE_CROP_SIZE)
    expect(await pixelAt(out, 0, 0)).toMatchObject({ r: FILL.r, g: FILL.g, b: FILL.b })
    expect(await pixelAt(out, 256, 256)).toMatchObject({ r: FILL.r, g: FILL.g, b: FILL.b })
  })

  it('leaves an already-full tile unchanged', async () => {
    const tile = await sharp({
      create: { width: TILE_CROP_SIZE, height: TILE_CROP_SIZE, channels: 4, background: FILL },
    })
      .png()
      .toBuffer()
    const out = await fillWhiteCornerTriangles(tile)
    expect(await pixelAt(out, 0, 0)).toMatchObject({ r: FILL.r, g: FILL.g, b: FILL.b })
    expect(await pixelAt(out, 511, 511)).toMatchObject({ r: FILL.r, g: FILL.g, b: FILL.b })
  })
})
