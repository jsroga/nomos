import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { assemblePackedContext } from '../assemble-packed-context'
import {
  PACKED_CANVAS_RGB,
  PACKED_HOLE_RGB,
  PACKED_TILE_SIZE,
} from '@/shared/ai/context-pack-layout'
import { BufferEncoding } from '@/shared/data/constants/protocol'
import type { TileContext } from '@/shared/ai/types'
import type { Tile } from '@/shared/data/world-tile'

const LEFT = { r: 20, g: 180, b: 40 }
const DOWN = { r: 240, g: 200, b: 20 }
const BOTTOM_LEFT = { r: 40, g: 80, b: 220 }
const COLOR_TOLERANCE = 8

async function solidPng(
  background: { r: number; g: number; b: number },
): Promise<Buffer> {
  return sharp({
    create: {
      width: PACKED_TILE_SIZE,
      height: PACKED_TILE_SIZE,
      channels: 4,
      background: { ...background, alpha: 1 },
    },
  })
    .png()
    .toBuffer()
}

function dataUrl(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString(BufferEncoding.Base64)}`
}

function neighborTile(imageUrl: string): Tile & { imageUrl: string } {
  return {
    id: 't',
    project_id: 'p',
    x: 0,
    y: 0,
    tile_prompt: null,
    image_filename: imageUrl,
    created_at: '',
    imageUrl,
  }
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

describe('assemblePackedContext 2×2 occupancy', () => {
  it('packs left, down, and bottomLeft around a grey hole', async () => {
    const context: TileContext = {
      targetX: 1,
      targetY: -1,
      neighbors: {
        left: neighborTile(dataUrl(await solidPng(LEFT))),
        down: neighborTile(dataUrl(await solidPng(DOWN))),
        bottomLeft: neighborTile(dataUrl(await solidPng(BOTTOM_LEFT))),
      },
      allTiles: {},
    }
    const assembled = await assemblePackedContext(context)
    expect(assembled.packedWidth).toBe(1024)
    expect(assembled.packedHeight).toBe(1024)
    expect(assembled.loadedNeighborCount).toBe(3)
    expect(assembled.cropRect).toEqual({
      x: PACKED_TILE_SIZE,
      y: 0,
      width: PACKED_TILE_SIZE,
      height: PACKED_TILE_SIZE,
    })
    const mid = PACKED_TILE_SIZE / 2
    near(await pixelAt(assembled.image, mid, mid), LEFT)
    near(await pixelAt(assembled.image, PACKED_TILE_SIZE + mid, mid), PACKED_HOLE_RGB)
    near(await pixelAt(assembled.image, PACKED_TILE_SIZE + mid, PACKED_TILE_SIZE + mid), DOWN)
    near(await pixelAt(assembled.image, mid, PACKED_TILE_SIZE + mid), BOTTOM_LEFT)
    near(await pixelAt(assembled.image, 0, 0), LEFT)
  })

  it('does not leave the 2×2 corner black when bottomLeft exists', async () => {
    const context: TileContext = {
      targetX: 1,
      targetY: -1,
      neighbors: {
        left: neighborTile(dataUrl(await solidPng(LEFT))),
        down: neighborTile(dataUrl(await solidPng(DOWN))),
        bottomLeft: neighborTile(dataUrl(await solidPng(BOTTOM_LEFT))),
      },
      allTiles: {},
    }
    const assembled = await assemblePackedContext(context)
    const corner = await pixelAt(assembled.image, 256, 768)
    expect(corner.r).not.toBe(PACKED_CANVAS_RGB.r)
    near(corner, BOTTOM_LEFT)
  })
})
