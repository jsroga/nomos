import { describe, expect, it } from 'vitest'
import { NextResponse } from 'next/server'
import { TileTriggerProvider } from '@/shared/data/constants/trigger-tile-route'
import { ImageEnvVar, ImageGenerateModelId } from '@/shared/ai/constants/image-env'
import { ApiframeImageModel } from '@/shared/ai/constants/apiframe'
import { resolveTileAiProvider } from '../trigger-tile-helpers'

describe('resolveTileAiProvider', () => {
  it('sends first tile (0,0) to Midjourney by default, not Grok', () => {
    const result = resolveTileAiProvider({
      isFirstTile: true,
      env: { hasApiframe: true },
      models: {
        [ImageEnvVar.TileFollowUpModel]: ImageGenerateModelId.GrokImagineImage,
        [ImageEnvVar.ApiKey]: 'afk_test',
      },
    })
    expect(result).not.toBeInstanceOf(NextResponse)
    if (result instanceof NextResponse) return
    expect(result.aiProvider).toBe(TileTriggerProvider.Midjourney)
    expect(result.aiConfig.model).toBe(ApiframeImageModel.Midjourney)
  })

  it('keeps follow-up tiles on the follow-up model', () => {
    const result = resolveTileAiProvider({
      isFirstTile: false,
      env: { hasApiframe: true },
      models: {
        [ImageEnvVar.TileFollowUpModel]: ImageGenerateModelId.GrokImagineImage,
        [ImageEnvVar.ApiKey]: 'afk_test',
      },
    })
    expect(result).not.toBeInstanceOf(NextResponse)
    if (result instanceof NextResponse) return
    expect(result.aiProvider).toBe(TileTriggerProvider.Grok)
    expect(result.aiConfig.model).toBe(ApiframeImageModel.GrokImagineImage)
  })

  it('honors IMAGE_TILE_FIRST_MODEL when it is grok', () => {
    const result = resolveTileAiProvider({
      isFirstTile: true,
      env: { hasApiframe: true },
      models: {
        [ImageEnvVar.TileFirstModel]: ImageGenerateModelId.GrokImagineImage,
      },
    })
    expect(result).not.toBeInstanceOf(NextResponse)
    if (result instanceof NextResponse) return
    expect(result.aiProvider).toBe(TileTriggerProvider.Grok)
  })
})
