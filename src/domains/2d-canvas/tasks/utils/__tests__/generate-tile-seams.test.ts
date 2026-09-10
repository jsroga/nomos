import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { blendFollowUpSeams } from '../generate-tile-seams'
import {
  CENTER_CROP_OFFSET,
  CONTEXT_CANVAS_SIZE,
  FOLLOW_UP_SEAM_BLEND_PX,
  TILE_CROP_SIZE,
} from '../generate-tile'
import {
  packedCanvasLayout,
  packedCropSpecFromLayout,
} from '@/shared/ai/context-pack-layout'

const GREY = { r: 128, g: 128, b: 128, alpha: 1 }
const NEIGHBOR = { r: 220, g: 30, b: 20, alpha: 1 }
const GENERATED = { r: 20, g: 40, b: 210, alpha: 1 }
const COLOR_TOLERANCE = 8

async function solidPng(
  width: number,
  height: number,
  background: { r: number; g: number; b: number; alpha: number },
): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 4, background } })
    .png()
    .toBuffer()
}

async function contextWithLeftNeighbor(): Promise<Buffer> {
  const strip = await solidPng(CENTER_CROP_OFFSET, TILE_CROP_SIZE, NEIGHBOR)
  return sharp({
    create: { width: CONTEXT_CANVAS_SIZE, height: CONTEXT_CANVAS_SIZE, channels: 4, background: GREY },
  })
    .composite([{ input: strip, left: 0, top: CENTER_CROP_OFFSET }])
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

function near(
  pixel: { r: number; g: number; b: number },
  color: { r: number; g: number; b: number },
): void {
  expect(pixel.r).toBeGreaterThanOrEqual(color.r - COLOR_TOLERANCE)
  expect(pixel.r).toBeLessThanOrEqual(color.r + COLOR_TOLERANCE)
  expect(pixel.g).toBeGreaterThanOrEqual(color.g - COLOR_TOLERANCE)
  expect(pixel.g).toBeLessThanOrEqual(color.g + COLOR_TOLERANCE)
  expect(pixel.b).toBeGreaterThanOrEqual(color.b - COLOR_TOLERANCE)
  expect(pixel.b).toBeLessThanOrEqual(color.b + COLOR_TOLERANCE)
}

describe('blendFollowUpSeams', () => {
  it('color-matches the left seam without copying a neighbor strip', async () => {
    const tile = await solidPng(TILE_CROP_SIZE, TILE_CROP_SIZE, GENERATED)
    const out = await blendFollowUpSeams(tile, await contextWithLeftNeighbor())
    const meta = await sharp(out).metadata()
    expect(meta.width).toBe(TILE_CROP_SIZE)
    expect(meta.height).toBe(TILE_CROP_SIZE)
    near(await pixelAt(out, 0, CENTER_CROP_OFFSET), NEIGHBOR)
    near(await pixelAt(out, FOLLOW_UP_SEAM_BLEND_PX + 4, CENTER_CROP_OFFSET), GENERATED)
    near(await pixelAt(out, 256, 256), GENERATED)
  })

  it('leaves the generated tile unchanged when neighbor strips are grey', async () => {
    const tile = await solidPng(TILE_CROP_SIZE, TILE_CROP_SIZE, GENERATED)
    const grey = await solidPng(CONTEXT_CANVAS_SIZE, CONTEXT_CANVAS_SIZE, GREY)
    const out = await blendFollowUpSeams(tile, grey)
    near(await pixelAt(out, 0, 0), GENERATED)
    near(await pixelAt(out, 256, 256), GENERATED)
  })

  it('color-matches left and down packed neighbors for an L-shape hole', async () => {
    const left = { r: 20, g: 180, b: 40, alpha: 1 }
    const down = { r: 240, g: 200, b: 20, alpha: 1 }
    const black = { r: 0, g: 0, b: 0, alpha: 1 }
    const layout = packedCanvasLayout({
      left: true,
      right: false,
      up: false,
      down: true,
    })
    const spec = packedCropSpecFromLayout(layout)
    const packed = await sharp({
      create: {
        width: layout.width,
        height: layout.height,
        channels: 4,
        background: black,
      },
    })
      .composite([
        { input: await solidPng(TILE_CROP_SIZE, TILE_CROP_SIZE, left), left: 0, top: 0 },
        {
          input: await solidPng(TILE_CROP_SIZE, TILE_CROP_SIZE, GREY),
          left: layout.hole.x,
          top: layout.hole.y,
        },
        {
          input: await solidPng(TILE_CROP_SIZE, TILE_CROP_SIZE, down),
          left: layout.hole.x,
          top: layout.hole.y + TILE_CROP_SIZE,
        },
      ])
      .png()
      .toBuffer()

    const tile = await solidPng(TILE_CROP_SIZE, TILE_CROP_SIZE, GENERATED)
    const out = await blendFollowUpSeams(tile, packed, spec)
    near(await pixelAt(out, 0, 256), left)
    near(await pixelAt(out, 256, TILE_CROP_SIZE - 1), down)
    near(await pixelAt(out, 256, 256), GENERATED)
    near(await pixelAt(out, TILE_CROP_SIZE - 1, 256), GENERATED)
    near(await pixelAt(out, 256, 0), GENERATED)
  })
})
