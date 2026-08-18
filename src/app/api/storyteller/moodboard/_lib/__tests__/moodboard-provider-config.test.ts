import { describe, expect, it } from 'vitest'
import { ImageEnvVar, ImageGenerateModelId } from '@/shared/ai/constants/image-env'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import { ApiframeImageModel } from '@/shared/ai/constants/apiframe'
import { resolveMoodboardProviderConfig } from '../moodboard-provider-config'

describe('resolveMoodboardProviderConfig', () => {
  it('uses IMAGE_MOODBOARD_MODEL even when the client sends another provider', () => {
    const resolved = resolveMoodboardProviderConfig(
      {
        provider: ImageGenProvider.NanoBanana,
        modelId: ApiframeImageModel.NanoBanana,
        apiKey: 'not-an-apiframe-key',
      },
      ['https://cdn.example/sref.png'],
      { [ImageEnvVar.MoodboardModel]: ImageGenerateModelId.Midjourney },
    )
    expect(resolved.provider).toBe(ImageGenProvider.Midjourney)
    expect(resolved.modelId).toBe(ApiframeImageModel.Midjourney)
    expect(resolved.styleReferenceUrls).toEqual(['https://cdn.example/sref.png'])
  })
})
