// import 'server-only'
import sharp from 'sharp'
import { TileContext } from '@/shared/ai/types'

export interface StyleInfo {
  brightness: 'bright' | 'medium' | 'dark'
  warmth: 'warm' | 'neutral' | 'cool'
  description: string
}

export class ImageService {
  /**
   * Crop an image buffer
   */
  async crop(
    buffer: Buffer,
    rect: { x: number; y: number; width: number; height: number }
  ): Promise<Buffer> {
    return sharp(buffer)
      .extract({
        left: Math.round(rect.x),
        top: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      })
      .png()
      .toBuffer()
  }

  /**
   * Assemble a context image for inpainting (central gray square surrounded by neighbors).
   * Layout and layer order MUST match contextAssembler.ts for consistent edge matching:
   * corners first (so edge strips overlay them), then edges, then gray center.
   * size: total canvas size (usually 1024)
   */
  async assembleContext(
    context: TileContext,
    size: number = 1024
  ): Promise<{
    image: Buffer
    mask: Buffer
    cropRect: { x: number; y: number; width: number; height: number }
    loadedNeighborCount: number
  }> {
    const TILE_SIZE = 512
    const CONTEXT_SIZE = (size - TILE_SIZE) / 2 // usually 256
    const TARGET_X = CONTEXT_SIZE
    const TARGET_Y = CONTEXT_SIZE

    // 1. Create base gray image (1024x1024)
    let composite = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 128, g: 128, b: 128, alpha: 1 },
      },
    })

    const compositionLayers: sharp.OverlayOptions[] = []

    // Helper to fetch image buffer (supports http/https URLs and data URLs)
    const fetchImageBuffer = async (url: string): Promise<Buffer | null> => {
      try {
        if (url.startsWith('data:')) {
          const base64 = url.includes(';base64,') ? url.split(';base64,')[1] : null
          if (!base64) return null
          return Buffer.from(base64, 'base64')
        }
        const response = await fetch(url)
        if (!response.ok) return null
        return Buffer.from(await response.arrayBuffer())
      } catch (e) {
        console.error(`[ImageService] Failed to fetch neighbor image: ${url.substring(0, 80)}`, e)
        return null
      }
    }

    // Crop semantics (must match contextAssembler): key 'up' = bottom half of neighbor image, 'down' = top, 'left' = right part, 'right' = left part; corners = corresponding corner of neighbor.
    const getEdgeCrop = async (imgBuffer: Buffer, edge: string) => {
      const metadata = await sharp(imgBuffer).metadata()
      const w = metadata.width || TILE_SIZE
      const h = metadata.height || TILE_SIZE
      const ratio = 0.5 // We want 256/512 of the edge

      switch (edge) {
        case 'up':
          return {
            left: 0,
            top: Math.round(h * (1 - ratio)),
            width: w,
            height: Math.round(h * ratio),
          }
        case 'down':
          return { left: 0, top: 0, width: w, height: Math.round(h * ratio) }
        case 'left':
          return {
            left: Math.round(w * (1 - ratio)),
            top: 0,
            width: Math.round(w * ratio),
            height: h,
          }
        case 'right':
          return { left: 0, top: 0, width: Math.round(w * ratio), height: h }
        // Corners
        case 'topLeft':
          return {
            left: Math.round(w * (1 - ratio)),
            top: Math.round(h * (1 - ratio)),
            width: Math.round(w * ratio),
            height: Math.round(h * ratio),
          }
        case 'topRight':
          return {
            left: 0,
            top: Math.round(h * (1 - ratio)),
            width: Math.round(w * ratio),
            height: Math.round(h * ratio),
          }
        case 'bottomLeft':
          return {
            left: Math.round(w * (1 - ratio)),
            top: 0,
            width: Math.round(w * ratio),
            height: Math.round(h * ratio),
          }
        case 'bottomRight':
          return { left: 0, top: 0, width: Math.round(w * ratio), height: Math.round(h * ratio) }
        default:
          return null
      }
    }

    const neighbors = context.neighbors
    // Order must match contextAssembler.ts: corners first, then edges (so edges overlay corners).
    const items = [
      { key: 'topLeft', neighbor: neighbors.topLeft, x: 0, y: 0, w: CONTEXT_SIZE, h: CONTEXT_SIZE },
      {
        key: 'topRight',
        neighbor: neighbors.topRight,
        x: TARGET_X + TILE_SIZE,
        y: 0,
        w: CONTEXT_SIZE,
        h: CONTEXT_SIZE,
      },
      {
        key: 'bottomLeft',
        neighbor: neighbors.bottomLeft,
        x: 0,
        y: TARGET_Y + TILE_SIZE,
        w: CONTEXT_SIZE,
        h: CONTEXT_SIZE,
      },
      {
        key: 'bottomRight',
        neighbor: neighbors.bottomRight,
        x: TARGET_X + TILE_SIZE,
        y: TARGET_Y + TILE_SIZE,
        w: CONTEXT_SIZE,
        h: CONTEXT_SIZE,
      },
      { key: 'up', neighbor: neighbors.up, x: TARGET_X, y: 0, w: TILE_SIZE, h: CONTEXT_SIZE },
      {
        key: 'down',
        neighbor: neighbors.down,
        x: TARGET_X,
        y: TARGET_Y + TILE_SIZE,
        w: TILE_SIZE,
        h: CONTEXT_SIZE,
      },
      { key: 'left', neighbor: neighbors.left, x: 0, y: TARGET_Y, w: CONTEXT_SIZE, h: TILE_SIZE },
      {
        key: 'right',
        neighbor: neighbors.right,
        x: TARGET_X + TILE_SIZE,
        y: TARGET_Y,
        w: CONTEXT_SIZE,
        h: TILE_SIZE,
      },
    ]

    let loadedNeighborCount = 0
    for (const item of items) {
      if (item.neighbor?.imageUrl) {
        const buffer = await fetchImageBuffer(item.neighbor.imageUrl)
        if (buffer) {
          const crop = await getEdgeCrop(buffer, item.key)
          if (crop) {
            const croppedNeighbor = await sharp(buffer)
              .extract(crop)
              .resize(item.w, item.h)
              .png()
              .toBuffer()

            compositionLayers.push({
              input: croppedNeighbor,
              top: item.y,
              left: item.x,
            })
            loadedNeighborCount++
          }
        }
      }
    }

    const centerFill = await sharp({
      create: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        channels: 4,
        background: { r: 128, g: 128, b: 128, alpha: 1 },
      },
    })
      .png()
      .toBuffer()

    compositionLayers.push({
      input: centerFill,
      top: TARGET_Y,
      left: TARGET_X,
    })

    const finalImage = await composite.composite(compositionLayers).png().toBuffer()

    // 2. Create Mask
    // White = keep, Transparent/Clear = edit
    const maskBase = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer()

    const transparentCenter = await sharp({
      create: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer()

    const finalMask = await sharp(maskBase)
      .composite([{ input: transparentCenter, top: TARGET_Y, left: TARGET_X, blend: 'dest-out' }])
      .png()
      .toBuffer()

    return {
      image: finalImage,
      mask: finalMask,
      cropRect: { x: TARGET_X, y: TARGET_Y, width: TILE_SIZE, height: TILE_SIZE },
      loadedNeighborCount,
    }
  }

  /**
   * Analyze image style
   */
  async analyzeStyle(buffer: Buffer): Promise<StyleInfo> {
    const stats = await sharp(buffer).stats()
    const { dominant } = stats

    const avgBrightness = (dominant.r + dominant.g + dominant.b) / 3
    let brightness: 'bright' | 'medium' | 'dark'
    if (avgBrightness > 180) brightness = 'bright'
    else if (avgBrightness > 80) brightness = 'medium'
    else brightness = 'dark'

    let warmth: 'warm' | 'neutral' | 'cool'
    if (dominant.r > dominant.b + 30) warmth = 'warm'
    else if (dominant.b > dominant.r + 30) warmth = 'cool'
    else warmth = 'neutral'

    return {
      brightness,
      warmth,
      description: `${brightness} ${warmth} palette`,
    }
  }
}

export const imageService = new ImageService()
