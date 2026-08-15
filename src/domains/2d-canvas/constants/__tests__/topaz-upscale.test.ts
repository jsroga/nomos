import { describe, expect, it } from 'vitest'
import {
  TOPAZ_MAX_OUTPUT_PX,
  TopazUpscaleFactor,
  resolveNearestNeighbourSize,
  resolveTopazUpscalePlan,
} from '../topaz-upscale'
import {
  GenerationMode,
  UpscaleStrategy,
  generationModeDef,
} from '../generation-modes'

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
  it('uses nearest-neighbour and disables fidelity enhance', () => {
    const mode = generationModeDef(GenerationMode.PixelArt)
    expect(mode.upscaleStrategy).toBe(UpscaleStrategy.NearestNeighbour)
    expect(mode.allowsFidelityEnhance).toBe(false)
  })
})
