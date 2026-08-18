import { describe, expect, it } from 'vitest'
import {
  TOPAZ_MAX_OUTPUT_PX,
  resolveNearestNeighbourSize,
  resolveTopazUpscalePlan,
  topazEnhanceModelFromFidelityMode,
  topazEnhanceModelFromMode,
} from '../topaz-upscale'
import {
  GenerationMode,
  UpscaleStrategy,
  generationModeDef,
} from '../generation-modes'
import { ImageFidelityMode, ImageUpscaleMode } from '@/shared/ai/constants/image-env'
import {
  ApiframeTopazModelType,
  ApiframeTopazUpscaleFactor,
} from '@/shared/ai/constants/apiframe'

describe('resolveTopazUpscalePlan', () => {
  it('caps a 512 tile at 4x / 2048', () => {
    const plan = resolveTopazUpscalePlan(512, 512)
    expect(plan.factor).toBe(ApiframeTopazUpscaleFactor.Four)
    expect(plan.outputWidth).toBe(TOPAZ_MAX_OUTPUT_PX)
    expect(plan.outputHeight).toBe(TOPAZ_MAX_OUTPUT_PX)
    expect(plan.megapixels).toBe(4.194304)
  })
})

describe('resolveNearestNeighbourSize', () => {
  it('integer-scales a 512 tile to 2048', () => {
    expect(resolveNearestNeighbourSize(512, 512)).toEqual({
      width: TOPAZ_MAX_OUTPUT_PX,
      height: TOPAZ_MAX_OUTPUT_PX,
    })
  })
})

describe('Pixel art upscale policy', () => {
  it('uses nearest-neighbour and disables fidelity enhance', async () => {
    const mode = generationModeDef(GenerationMode.PixelArt)
    expect(mode.upscaleStrategy).toBe(UpscaleStrategy.NearestNeighbour)
    expect(mode.allowsFidelityEnhance).toBe(false)
  })
})

describe('topazEnhanceModelFromMode', () => {
  it('maps standard to standard-v2 and creative to high-fidelity-v2', () => {
    expect(topazEnhanceModelFromMode(ImageUpscaleMode.Standard)).toBe(
      ApiframeTopazModelType.StandardV2,
    )
    expect(topazEnhanceModelFromMode(ImageUpscaleMode.Creative)).toBe(
      ApiframeTopazModelType.HighFidelityV2,
    )
  })
})

describe('topazEnhanceModelFromFidelityMode', () => {
  it('maps redefine and the shared upscale modes', () => {
    expect(topazEnhanceModelFromFidelityMode(ImageFidelityMode.Redefine)).toBe(
      ApiframeTopazModelType.Redefine,
    )
    expect(topazEnhanceModelFromFidelityMode(ImageFidelityMode.Standard)).toBe(
      ApiframeTopazModelType.StandardV2,
    )
    expect(topazEnhanceModelFromFidelityMode(ImageFidelityMode.Creative)).toBe(
      ApiframeTopazModelType.HighFidelityV2,
    )
    expect(topazEnhanceModelFromFidelityMode(ImageFidelityMode.Cgi)).toBe(
      ApiframeTopazModelType.Cgi,
    )
  })
})
