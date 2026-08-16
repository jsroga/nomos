import { describe, expect, it } from 'vitest'
import {
  TOPAZ_MAX_OUTPUT_PX,
  TopazEnhanceModel,
  TopazUpscaleFactor,
  resolveNearestNeighbourSize,
  resolveTopazUpscalePlan,
  topazEnhanceModelFromMode,
} from '../topaz-upscale'
import {
  GenerationMode,
  UpscaleStrategy,
  generationModeDef,
} from '../generation-modes'
import { ImageUpscaleMode } from '@/shared/ai/constants/image-env'

describe('resolveTopazUpscalePlan', () => {
  it('caps a 512 tile at 4x / 2048', () => {
    const plan = resolveTopazUpscalePlan(512, 512)
    expect(plan.factor).toBe(TopazUpscaleFactor.FourX)
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
  it('maps standard to Standard V2 and creative to High Fidelity V2', () => {
    expect(topazEnhanceModelFromMode(ImageUpscaleMode.Standard)).toBe(
      TopazEnhanceModel.StandardV2,
    )
    expect(topazEnhanceModelFromMode(ImageUpscaleMode.Creative)).toBe(
      TopazEnhanceModel.HighFidelityV2,
    )
  })
})
