import { ImageFidelityMode, ImageUpscaleMode } from '@/shared/ai/constants/image-env'
import {
  ApiframeTopazModelType,
  ApiframeTopazUpscaleFactor,
} from '@/shared/ai/constants/apiframe'

export const TOPAZ_MAX_OUTPUT_PX = 2048
export const TOPAZ_MEGAPIXEL_DIVISOR = 1_000_000

export function topazEnhanceModelFromMode(mode: ImageUpscaleMode): ApiframeTopazModelType {
  return mode === ImageUpscaleMode.Creative
    ? ApiframeTopazModelType.HighFidelityV2
    : ApiframeTopazModelType.StandardV2
}

export function topazEnhanceModelFromFidelityMode(
  mode: ImageFidelityMode,
): ApiframeTopazModelType {
  switch (mode) {
    case ImageFidelityMode.Creative:
      return ApiframeTopazModelType.HighFidelityV2
    case ImageFidelityMode.LowResolution:
      return ApiframeTopazModelType.LowResV2
    case ImageFidelityMode.Cgi:
      return ApiframeTopazModelType.Cgi
    case ImageFidelityMode.TextRefine:
      return ApiframeTopazModelType.TextRefine
    case ImageFidelityMode.Redefine:
      return ApiframeTopazModelType.Redefine
    case ImageFidelityMode.Standard:
      return ApiframeTopazModelType.StandardV2
  }
}

const FACTOR_STEPS: Array<{ factor: ApiframeTopazUpscaleFactor; scale: number }> = [
  { factor: ApiframeTopazUpscaleFactor.Six, scale: 6 },
  { factor: ApiframeTopazUpscaleFactor.Four, scale: 4 },
  { factor: ApiframeTopazUpscaleFactor.Two, scale: 2 },
]

export function resolveNearestNeighbourSize(
  width: number,
  height: number
): { width: number; height: number } {
  const srcW = Math.max(1, width)
  const srcH = Math.max(1, height)
  const scale = Math.max(1, Math.floor(TOPAZ_MAX_OUTPUT_PX / Math.max(srcW, srcH)))
  return { width: srcW * scale, height: srcH * scale }
}

export function resolveTopazUpscalePlan(
  width: number,
  height: number
): {
  factor: ApiframeTopazUpscaleFactor
  outputWidth: number
  outputHeight: number
  megapixels: number
} {
  const srcW = Math.max(1, width)
  const srcH = Math.max(1, height)
  for (const step of FACTOR_STEPS) {
    const outputWidth = srcW * step.scale
    const outputHeight = srcH * step.scale
    if (Math.max(outputWidth, outputHeight) <= TOPAZ_MAX_OUTPUT_PX) {
      return {
        factor: step.factor,
        outputWidth,
        outputHeight,
        megapixels: (outputWidth * outputHeight) / TOPAZ_MEGAPIXEL_DIVISOR,
      }
    }
  }
  return {
    factor: ApiframeTopazUpscaleFactor.One,
    outputWidth: srcW,
    outputHeight: srcH,
    megapixels: (srcW * srcH) / TOPAZ_MEGAPIXEL_DIVISOR,
  }
}
