export const TOPAZ_MAX_OUTPUT_PX = 2048
export const TOPAZ_MEGAPIXEL_DIVISOR = 1_000_000
export const TOPAZ_REPLICATE_MODEL = 'topazlabs/image-upscale'

export enum TopazUpscaleFactor {
  None = 'None',
  TwoX = '2x',
  FourX = '4x',
  SixX = '6x',
}

export enum TopazEnhanceModel {
  HighFidelityV2 = 'High Fidelity V2',
}

export enum TopazOutputFormat {
  Png = 'png',
}

const FACTOR_STEPS: Array<{ factor: TopazUpscaleFactor; scale: number }> = [
  { factor: TopazUpscaleFactor.SixX, scale: 6 },
  { factor: TopazUpscaleFactor.FourX, scale: 4 },
  { factor: TopazUpscaleFactor.TwoX, scale: 2 },
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
  factor: TopazUpscaleFactor
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
    factor: TopazUpscaleFactor.None,
    outputWidth: srcW,
    outputHeight: srcH,
    megapixels: (srcW * srcH) / TOPAZ_MEGAPIXEL_DIVISOR,
  }
}
