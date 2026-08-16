import { describe, expect, it } from 'vitest'
import { TileTriggerProvider } from '@/shared/data/constants/trigger-tile-route'
import { ImageEnvVar, ImageGenerateModelId, ImageUpscaleMode, ImageUpscaleModelId } from '@/shared/ai/constants/image-env'
import { resolveFollowUpImageProviderFromEnv } from '../follow-up-provider'
import {
  resolveTileFirstModel,
  resolveTileFollowUpModel,
  resolveUpscaleModelId,
  resolveDefaultUpscaleProvider,
  resolveImageUpscaleMode,
} from '@/shared/ai/image-model-env'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import { ApiframeImageModel } from '@/shared/ai/constants/apiframe'

describe('resolveFollowUpImageProviderFromEnv', () => {
  it('selects from IMAGE_TILE_FOLLOW_UP_MODEL', () => {
    expect(
      resolveFollowUpImageProviderFromEnv({
        [ImageEnvVar.TileFollowUpModel]: ImageGenerateModelId.GrokImagineImage,
      }),
    ).toBe(TileTriggerProvider.Grok)
    expect(
      resolveFollowUpImageProviderFromEnv({
        [ImageEnvVar.TileFollowUpModel]: ImageGenerateModelId.Midjourney,
      }),
    ).toBe(TileTriggerProvider.Midjourney)
    expect(
      resolveFollowUpImageProviderFromEnv({
        [ImageEnvVar.TileFollowUpModel]: ImageGenerateModelId.NanoBananaPro,
      }),
    ).toBe(TileTriggerProvider.NanoBanana)
  })

  it('accepts legacy FOLLOW_UP_IMAGE_PROVIDER aliases', () => {
    expect(
      resolveFollowUpImageProviderFromEnv({
        [ImageEnvVar.LegacyFollowUpProvider]: 'grok',
      }),
    ).toBe(TileTriggerProvider.Grok)
    expect(
      resolveFollowUpImageProviderFromEnv({
        [ImageEnvVar.LegacyFollowUpProvider]: 'midjourney',
      }),
    ).toBe(TileTriggerProvider.Midjourney)
  })

  it('defaults to grok when unset and Apiframe is configured', () => {
    expect(
      resolveFollowUpImageProviderFromEnv({ [ImageEnvVar.ApiKey]: 'afk_test' }),
    ).toBe(TileTriggerProvider.Grok)
  })

  it('defaults to nano-banana when unset and Apiframe is missing', () => {
    expect(resolveFollowUpImageProviderFromEnv({})).toBe(TileTriggerProvider.NanoBanana)
  })
})

describe('image model env resolvers', () => {
  it('resolves tile first model', () => {
    expect(
      resolveTileFirstModel({
        [ImageEnvVar.TileFirstModel]: ImageGenerateModelId.NanoBanana,
      }),
    ).toBe(ApiframeImageModel.NanoBanana)
    expect(resolveTileFirstModel({})).toBe(ApiframeImageModel.GrokImagineImage)
  })

  it('resolves upscale model aliases', () => {
    expect(
      resolveUpscaleModelId({ [ImageEnvVar.UpscaleModel]: 'clarity' }),
    ).toBe(ImageUpscaleModelId.ClarityUpscale)
    expect(
      resolveDefaultUpscaleProvider({ [ImageEnvVar.UpscaleModel]: 'clarity' }),
    ).toBe(ImageGenProvider.Replicate)
    expect(resolveDefaultUpscaleProvider({})).toBe(ImageGenProvider.Stability)
  })

  it('resolves IMAGE_UPSCALE_MODE for Topaz standard vs creative', () => {
    expect(resolveImageUpscaleMode({})).toBe(ImageUpscaleMode.Standard)
    expect(
      resolveImageUpscaleMode({ [ImageEnvVar.UpscaleMode]: ImageUpscaleMode.Creative }),
    ).toBe(ImageUpscaleMode.Creative)
    expect(
      resolveImageUpscaleMode({ [ImageEnvVar.UpscaleMode]: ImageUpscaleMode.Standard }),
    ).toBe(ImageUpscaleMode.Standard)
  })

  it('prefers IMAGE_TILE_FOLLOW_UP_MODEL over legacy', () => {
    expect(
      resolveTileFollowUpModel({
        [ImageEnvVar.TileFollowUpModel]: ImageGenerateModelId.Midjourney,
        [ImageEnvVar.LegacyFollowUpProvider]: 'grok',
      }),
    ).toBe(ApiframeImageModel.Midjourney)
  })
})
