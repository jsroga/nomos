import sharp from 'sharp'
import { TileContext } from '@/shared/ai/types'
import {
  ImageStyleBrightness,
  ImageStyleWarmth,
} from '@/shared/data/server/constants/image-service'
import {
  assemblePackedContext,
  type AssembledPackedContext,
} from '@/shared/data/server/assemble-packed-context'

export interface StyleInfo {
  brightness: `${ImageStyleBrightness}`
  warmth: `${ImageStyleWarmth}`
  description: string
}

export class ImageService {
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
   * Tight-pack full 512 cardinal neighbors around a grey hole.
   * Layout must match contextAssembler.ts. `size` is ignored (kept for callers).
   */
  async assembleContext(
    context: TileContext,
    _size: number = 1024
  ): Promise<AssembledPackedContext> {
    return assemblePackedContext(context)
  }

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
