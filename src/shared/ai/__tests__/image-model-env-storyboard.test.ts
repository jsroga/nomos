import { describe, expect, it } from 'vitest'
import { ImageEnvVar, ImageRepaintModelId } from '@/shared/ai/constants/image-env'
import { ApiframeEditModel, ApiframeImageModel } from '@/shared/ai/constants/apiframe'
import {
  resolveCombinedStoryboardModel,
  resolveMoodboardModel,
  resolveRepaintModel,
} from '@/shared/ai/image-model-env'

describe('image model defaults', () => {
  it('defaults combined storyboard to nano-banana-pro', () => {
    expect(resolveCombinedStoryboardModel({})).toBe(ApiframeImageModel.NanoBananaPro)
  })

  it('defaults moodboard to midjourney', () => {
    expect(resolveMoodboardModel({})).toBe(ApiframeImageModel.Midjourney)
  })

  it('honors IMAGE_COMBINED_STORYBOARD_MODEL', () => {
    expect(
      resolveCombinedStoryboardModel({
        [ImageEnvVar.CombinedStoryboardModel]: 'gpt-image-1.5',
      }),
    ).toBe(ApiframeImageModel.GptImage15)
  })

  it('defaults canvas repaint to gpt-image-2', () => {
    expect(resolveRepaintModel({})).toBe(ApiframeImageModel.GptImage2)
    expect(
      resolveRepaintModel({ [ImageEnvVar.RepaintModel]: ImageRepaintModelId.GptImage2 }),
    ).toBe(ApiframeImageModel.GptImage2)
    expect(
      resolveRepaintModel({ [ImageEnvVar.RepaintModel]: ApiframeEditModel.FluxFillPro }),
    ).toBe(ApiframeImageModel.GptImage2)
  })
})
