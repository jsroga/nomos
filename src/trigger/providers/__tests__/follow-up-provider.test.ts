import { describe, expect, it } from 'vitest'
import { TileTriggerProvider } from '@/shared/data/constants/trigger-tile-route'
import { FidelityEngine, ImageEnvVar, ImageFidelityMode, ImageFidelityModeAlias, ImageGenerateModelId, ImageModelAlias, ImageUpscaleMode, ImageUpscaleModelId } from '@/shared/ai/constants/image-env'
import { resolveFollowUpImageProviderFromEnv } from '../follow-up-provider'
import {
  resolveTileFirstModel,
  resolveTileFollowUpModel,
  resolveTileGenerationModel,
  resolveUpscaleModelId,
  resolveDefaultUpscaleProvider,
  resolveImageUpscaleMode,
  resolveImageFidelityMode,
  resolveFidelityEngine,
  resolveFidelityModel,
  resolveMoodboardModel,
  resolveEpisodePosterModel,
  resolveSeriesPosterModel,
  resolvePosterGenerateModel,
  ImagePosterSurface,
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
    expect(resolveTileFirstModel({})).toBe(ApiframeImageModel.Midjourney)
    expect(resolveTileGenerationModel(true, {})).toBe(ApiframeImageModel.Midjourney)
    expect(
      resolveTileGenerationModel(true, {
        [ImageEnvVar.TileFollowUpModel]: ImageGenerateModelId.GrokImagineImage,
        [ImageEnvVar.ApiKey]: 'afk_test',
      }),
    ).toBe(ApiframeImageModel.Midjourney)
  })

  it('keeps follow-up tiles on Grok when first tile is Midjourney', () => {
    expect(
      resolveTileGenerationModel(false, { [ImageEnvVar.ApiKey]: 'afk_test' }),
    ).toBe(ApiframeImageModel.GrokImagineImage)
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

  it('resolves IMAGE_FIDELITY_MODE and defaults to redefine', () => {
    expect(resolveImageFidelityMode({})).toBe(ImageFidelityMode.Redefine)
    expect(
      resolveImageFidelityMode({ [ImageEnvVar.FidelityMode]: ImageFidelityMode.Standard }),
    ).toBe(ImageFidelityMode.Standard)
    expect(
      resolveImageFidelityMode({ [ImageEnvVar.FidelityMode]: ImageFidelityModeAlias.Wonder }),
    ).toBe(ImageFidelityMode.Redefine)
  })

  it('routes IMAGE_FIDELITY_MODEL to Topaz or generate', () => {
    expect(resolveFidelityEngine({})).toBe(FidelityEngine.Generate)
    expect(resolveFidelityModel({})).toBe(ApiframeImageModel.GrokImagineImage)
    expect(
      resolveFidelityEngine({ [ImageEnvVar.FidelityModel]: ImageModelAlias.Topaz }),
    ).toBe(FidelityEngine.Topaz)
    expect(
      resolveFidelityEngine({
        [ImageEnvVar.FidelityModel]: ImageUpscaleModelId.TopazImageUpscale,
      }),
    ).toBe(FidelityEngine.Topaz)
    expect(
      resolveFidelityModel({ [ImageEnvVar.FidelityModel]: ImageGenerateModelId.NanoBanana }),
    ).toBe(ApiframeImageModel.NanoBanana)
    expect(
      resolveFidelityModel({ [ImageEnvVar.FidelityModel]: ImageModelAlias.Grok }),
    ).toBe(ApiframeImageModel.GrokImagineImage)
    expect(
      resolveFidelityModel({ [ImageEnvVar.FidelityModel]: ImageGenerateModelId.Midjourney }),
    ).toBe(ApiframeImageModel.GrokImagineImage)
  })

  it('prefers IMAGE_TILE_FOLLOW_UP_MODEL over legacy', () => {
    expect(
      resolveTileFollowUpModel({
        [ImageEnvVar.TileFollowUpModel]: ImageGenerateModelId.Midjourney,
        [ImageEnvVar.LegacyFollowUpProvider]: 'grok',
      }),
    ).toBe(ApiframeImageModel.Midjourney)
  })

  it('resolves moodboard, episode poster, and series poster including Midjourney', () => {
    expect(resolveMoodboardModel({})).toBe(ApiframeImageModel.Midjourney)
    expect(
      resolveMoodboardModel({
        [ImageEnvVar.MoodboardModel]: ImageGenerateModelId.Midjourney,
      }),
    ).toBe(ApiframeImageModel.Midjourney)
    expect(resolveEpisodePosterModel({})).toBe(ApiframeImageModel.NanoBanana)
    expect(
      resolveEpisodePosterModel({
        [ImageEnvVar.EpisodePosterModel]: ImageGenerateModelId.Midjourney,
      }),
    ).toBe(ApiframeImageModel.Midjourney)
    expect(resolveSeriesPosterModel({})).toBe(ApiframeImageModel.Midjourney)
    expect(
      resolveSeriesPosterModel({
        [ImageEnvVar.SeriesPosterModel]: ImageGenerateModelId.NanoBanana,
      }),
    ).toBe(ApiframeImageModel.NanoBanana)
    expect(
      resolvePosterGenerateModel(ImagePosterSurface.Episode, {
        [ImageEnvVar.EpisodePosterModel]: ImageGenerateModelId.Midjourney,
      }),
    ).toBe(ApiframeImageModel.Midjourney)
    expect(
      resolvePosterGenerateModel(ImagePosterSurface.Series, {
        [ImageEnvVar.SeriesPosterModel]: ImageGenerateModelId.Midjourney,
      }),
    ).toBe(ApiframeImageModel.Midjourney)
  })
})
