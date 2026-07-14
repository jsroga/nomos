// import 'server-only'
import sharp from 'sharp'
import { TileContext } from '@/shared/ai/types'
import { BufferEncoding, UrlScheme } from '@/shared/data/constants/protocol'
import {
  DataUrlSeparator,
  ImageServiceLog,
  ImageStyleBrightness,
  ImageStyleWarmth,
  SharpBlendMode,
  TileNeighborEdge,
} from '@/shared/data/server/constants/image-service'

export interface StyleInfo {
  brightness: `${ImageStyleBrightness}`
  warmth: `${ImageStyleWarmth}`
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
        if (url.startsWith(UrlScheme.Data)) {
          const base64 = url.includes(DataUrlSeparator.Base64Marker)
            ? url.split(DataUrlSeparator.Base64Marker)[1]
            : null
          if (!base64) return null
          return Buffer.from(base64, BufferEncoding.Base64)
        }
        const response = await fetch(url)
        if (!response.ok) return null
        return Buffer.from(await response.arrayBuffer())
      } catch (e) {
        console.error(`${ImageServiceLog.NeighborFetchFailed} ${url.substring(0, 80)}`, e)
        return null
      }
    }

    // Crop semantics (must match contextAssembler): key 'up' = bottom half of neighbor image, 'down' = top, 'left' = right part, 'right' = left part; corners = corresponding corner of neighbor.
    const getEdgeCrop = async (imgBuffer: Buffer, edge: TileNeighborEdge) => {
      const metadata = await sharp(imgBuffer).metadata()
      const w = metadata.width || TILE_SIZE
      const h = metadata.height || TILE_SIZE
      const ratio = 0.5 // We want 256/512 of the edge

      switch (edge) {
        case TileNeighborEdge.Up:
          return {
            left: 0,
            top: Math.round(h * (1 - ratio)),
            width: w,
            height: Math.round(h * ratio),
          }
        case TileNeighborEdge.Down:
          return { left: 0, top: 0, width: w, height: Math.round(h * ratio) }
        case TileNeighborEdge.Left:
          return {
            left: Math.round(w * (1 - ratio)),
            top: 0,
            width: Math.round(w * ratio),
            height: h,
          }
        case TileNeighborEdge.Right:
          return { left: 0, top: 0, width: Math.round(w * ratio), height: h }
        // Corners
        case TileNeighborEdge.TopLeft:
          return {
            left: Math.round(w * (1 - ratio)),
            top: Math.round(h * (1 - ratio)),
            width: Math.round(w * ratio),
            height: Math.round(h * ratio),
          }
        case TileNeighborEdge.TopRight:
          return {
            left: 0,
            top: Math.round(h * (1 - ratio)),
            width: Math.round(w * ratio),
            height: Math.round(h * ratio),
          }
        case TileNeighborEdge.BottomLeft:
          return {
            left: Math.round(w * (1 - ratio)),
            top: 0,
            width: Math.round(w * ratio),
            height: Math.round(h * ratio),
          }
        case TileNeighborEdge.BottomRight:
          return { left: 0, top: 0, width: Math.round(w * ratio), height: Math.round(h * ratio) }
        default:
          return null
      }
    }

    const neighbors = context.neighbors
    // Order must match contextAssembler.ts: corners first, then edges (so edges overlay corners).
    const items: Array<{
      key: TileNeighborEdge
      neighbor: (typeof neighbors)[keyof typeof neighbors]
      x: number
      y: number
      w: number
      h: number
    }> = [
      {
        key: TileNeighborEdge.TopLeft,
        neighbor: neighbors.topLeft,
        x: 0,
        y: 0,
        w: CONTEXT_SIZE,
        h: CONTEXT_SIZE,
      },
      {
        key: TileNeighborEdge.TopRight,
        neighbor: neighbors.topRight,
        x: TARGET_X + TILE_SIZE,
        y: 0,
        w: CONTEXT_SIZE,
        h: CONTEXT_SIZE,
      },
      {
        key: TileNeighborEdge.BottomLeft,
        neighbor: neighbors.bottomLeft,
        x: 0,
        y: TARGET_Y + TILE_SIZE,
        w: CONTEXT_SIZE,
        h: CONTEXT_SIZE,
      },
      {
        key: TileNeighborEdge.BottomRight,
        neighbor: neighbors.bottomRight,
        x: TARGET_X + TILE_SIZE,
        y: TARGET_Y + TILE_SIZE,
        w: CONTEXT_SIZE,
        h: CONTEXT_SIZE,
      },
      {
        key: TileNeighborEdge.Up,
        neighbor: neighbors.up,
        x: TARGET_X,
        y: 0,
        w: TILE_SIZE,
        h: CONTEXT_SIZE,
      },
      {
        key: TileNeighborEdge.Down,
        neighbor: neighbors.down,
        x: TARGET_X,
        y: TARGET_Y + TILE_SIZE,
        w: TILE_SIZE,
        h: CONTEXT_SIZE,
      },
      {
        key: TileNeighborEdge.Left,
        neighbor: neighbors.left,
        x: 0,
        y: TARGET_Y,
        w: CONTEXT_SIZE,
        h: TILE_SIZE,
      },
      {
        key: TileNeighborEdge.Right,
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
      .composite([
        {
          input: transparentCenter,
          top: TARGET_Y,
          left: TARGET_X,
          blend: SharpBlendMode.DestOut,
        },
      ])
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
    let brightness: `${ImageStyleBrightness}`
    if (avgBrightness > 180) brightness = ImageStyleBrightness.Bright
    else if (avgBrightness > 80) brightness = ImageStyleBrightness.Medium
    else brightness = ImageStyleBrightness.Dark

    let warmth: `${ImageStyleWarmth}`
    if (dominant.r > dominant.b + 30) warmth = ImageStyleWarmth.Warm
    else if (dominant.b > dominant.r + 30) warmth = ImageStyleWarmth.Cool
    else warmth = ImageStyleWarmth.Neutral

    return {
      brightness,
      warmth,
      description: `${brightness} ${warmth} palette`,
    }
  }
}

export const imageService = new ImageService()
