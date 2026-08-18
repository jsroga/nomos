import { TileTriggerProvider } from '@/shared/data/constants/trigger-tile-route'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import {
  ApiframeEditModel,
  ApiframeImageModel,
  ApiframeUpscaleModel,
} from '@/shared/ai/constants/apiframe'
import {
  ImageEnvVar,
  ImageFidelityMode,
  ImageFidelityModeAlias,
  FidelityEngine,
  ImageGenerateModelId,
  ImageModelAlias,
  ImageRepaintModelId,
  ImageUpscaleMode,
  ImageUpscaleModelId,
} from '@/shared/ai/constants/image-env'

export type ImageGenerateModel = ApiframeImageModel
export type FollowUpImageProvider =
  | typeof TileTriggerProvider.Midjourney
  | typeof TileTriggerProvider.NanoBanana
  | typeof TileTriggerProvider.Grok
  | typeof TileTriggerProvider.OpenAi
  | typeof TileTriggerProvider.Stability

const GENERATE_MODELS = new Set<string>(Object.values(ImageGenerateModelId))
const UPSCALE_MODELS = new Set<string>(Object.values(ImageUpscaleModelId))
const REPAINT_MODELS = new Set<string>(Object.values(ImageRepaintModelId))

function readEnv(name: ImageEnvVar, source?: Record<string, string | undefined>): string | undefined {
  const raw = source ? source[name] : process.env[name]
  const trimmed = raw?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : undefined
}

function normalizeGenerateToken(raw: string): string {
  const value = raw.trim().toLowerCase()
  switch (value) {
    case ImageModelAlias.Grok:
      return ImageGenerateModelId.GrokImagineImage
    case ImageModelAlias.Gemini:
      return ImageGenerateModelId.NanoBanana
    case ImageModelAlias.OpenAi:
      return ImageGenerateModelId.GptImage15
    case ImageModelAlias.Stability:
      return ImageGenerateModelId.Flux2Pro
    default:
      return value
  }
}

function normalizeUpscaleToken(raw: string): string {
  const value = raw.trim().toLowerCase()
  switch (value) {
    case ImageModelAlias.Clarity:
    case ImageModelAlias.Replicate:
      return ImageUpscaleModelId.ClarityUpscale
    case ImageModelAlias.Topaz:
    case ImageModelAlias.Stability:
      return ImageUpscaleModelId.TopazImageUpscale
    case ImageModelAlias.Midjourney:
      return ImageUpscaleModelId.Midjourney
    default:
      return value
  }
}

export function parseImageGenerateModel(
  raw: string | undefined,
  fallback: ImageGenerateModel,
): ImageGenerateModel {
  if (!raw) return fallback
  const normalized = normalizeGenerateToken(raw)
  if (!GENERATE_MODELS.has(normalized)) return fallback
  switch (normalized) {
    case ImageGenerateModelId.Midjourney:
      return ApiframeImageModel.Midjourney
    case ImageGenerateModelId.NanoBanana:
      return ApiframeImageModel.NanoBanana
    case ImageGenerateModelId.NanoBananaPro:
      return ApiframeImageModel.NanoBananaPro
    case ImageGenerateModelId.GrokImagineImage:
      return ApiframeImageModel.GrokImagineImage
    case ImageGenerateModelId.GptImage15:
      return ApiframeImageModel.GptImage15
    case ImageGenerateModelId.Flux2Pro:
      return ApiframeImageModel.Flux2Pro
    default:
      return fallback
  }
}

export function imageGenerateModelToTileProvider(model: ImageGenerateModel): FollowUpImageProvider {
  switch (model) {
    case ApiframeImageModel.Midjourney:
      return TileTriggerProvider.Midjourney
    case ApiframeImageModel.GrokImagineImage:
      return TileTriggerProvider.Grok
    case ApiframeImageModel.GptImage15:
      return TileTriggerProvider.OpenAi
    case ApiframeImageModel.Flux2Pro:
      return TileTriggerProvider.Stability
    case ApiframeImageModel.NanoBanana:
    case ApiframeImageModel.NanoBananaPro:
    default:
      return TileTriggerProvider.NanoBanana
  }
}

export function imageGenerateModelToImageGenProvider(model: ImageGenerateModel): ImageGenProvider {
  switch (model) {
    case ApiframeImageModel.Midjourney:
      return ImageGenProvider.Midjourney
    case ApiframeImageModel.GrokImagineImage:
      return ImageGenProvider.Grok
    case ApiframeImageModel.GptImage15:
      return ImageGenProvider.OpenAi
    case ApiframeImageModel.Flux2Pro:
      return ImageGenProvider.Stability
    case ApiframeImageModel.NanoBanana:
    case ApiframeImageModel.NanoBananaPro:
      return ImageGenProvider.NanoBanana
    default:
      return ImageGenProvider.NanoBanana
  }
}

export function resolveImageModel(
  envVar: ImageEnvVar,
  fallback: ImageGenerateModel,
  source?: Record<string, string | undefined>,
): ImageGenerateModel {
  return parseImageGenerateModel(readEnv(envVar, source), fallback)
}

export function resolveTileFirstModel(source?: Record<string, string | undefined>): ImageGenerateModel {
  return resolveImageModel(
    ImageEnvVar.TileFirstModel,
    ApiframeImageModel.Midjourney,
    source,
  )
}

export function resolveTileGenerationModel(
  isFirstTile: boolean,
  source?: Record<string, string | undefined>,
): ImageGenerateModel {
  return isFirstTile ? resolveTileFirstModel(source) : resolveTileFollowUpModel(source)
}

export function resolveTileFollowUpModel(
  source?: Record<string, string | undefined>,
): ImageGenerateModel {
  const primary = readEnv(ImageEnvVar.TileFollowUpModel, source)
  if (primary) {
    return parseImageGenerateModel(primary, ApiframeImageModel.GrokImagineImage)
  }
  const legacyModel = readEnv(ImageEnvVar.LegacyFollowUpModel, source)
  if (legacyModel) {
    return parseImageGenerateModel(legacyModel, ApiframeImageModel.GrokImagineImage)
  }
  const legacyProvider = readEnv(ImageEnvVar.LegacyFollowUpProvider, source)
  if (legacyProvider) {
    return parseImageGenerateModel(legacyProvider, ApiframeImageModel.GrokImagineImage)
  }
  const apiKey = readEnv(ImageEnvVar.ApiKey, source)
  return apiKey ? ApiframeImageModel.GrokImagineImage : ApiframeImageModel.NanoBanana
}

export function resolveMoodboardModel(source?: Record<string, string | undefined>): ImageGenerateModel {
  return resolveImageModel(ImageEnvVar.MoodboardModel, ApiframeImageModel.NanoBanana, source)
}

export function resolveStoryboardModel(source?: Record<string, string | undefined>): ImageGenerateModel {
  return resolveImageModel(ImageEnvVar.StoryboardModel, ApiframeImageModel.NanoBanana, source)
}

export function resolveEpisodePosterModel(
  source?: Record<string, string | undefined>,
): ImageGenerateModel {
  return resolveImageModel(ImageEnvVar.EpisodePosterModel, ApiframeImageModel.NanoBanana, source)
}

export function resolveSeriesPosterModel(
  source?: Record<string, string | undefined>,
): ImageGenerateModel {
  return resolveImageModel(ImageEnvVar.SeriesPosterModel, ApiframeImageModel.Midjourney, source)
}

export enum ImagePosterSurface {
  Episode = 'episode',
  Series = 'series',
}

export function resolvePosterGenerateModel(
  surface: ImagePosterSurface,
  source?: Record<string, string | undefined>,
): ImageGenerateModel {
  return surface === ImagePosterSurface.Series
    ? resolveSeriesPosterModel(source)
    : resolveEpisodePosterModel(source)
}

export function resolvePortraitModel(source?: Record<string, string | undefined>): ImageGenerateModel {
  return resolveImageModel(ImageEnvVar.PortraitModel, ApiframeImageModel.Midjourney, source)
}

export function resolveFidelityModel(source?: Record<string, string | undefined>): ImageGenerateModel {
  const raw = readEnv(ImageEnvVar.FidelityModel, source)
  if (!raw || isTopazFidelityToken(raw)) return ApiframeImageModel.GrokImagineImage
  const model = parseImageGenerateModel(raw, ApiframeImageModel.GrokImagineImage)
  if (model === ApiframeImageModel.Midjourney) return ApiframeImageModel.GrokImagineImage
  return model
}

function isTopazFidelityToken(raw: string): boolean {
  const value = raw.trim().toLowerCase()
  return value === ImageModelAlias.Topaz || value === ImageUpscaleModelId.TopazImageUpscale
}

export function resolveFidelityEngine(
  source?: Record<string, string | undefined>,
): FidelityEngine {
  const raw = readEnv(ImageEnvVar.FidelityModel, source)
  if (raw && isTopazFidelityToken(raw)) return FidelityEngine.Topaz
  return FidelityEngine.Generate
}

export function resolveUpscaleModelId(
  source?: Record<string, string | undefined>,
): ImageUpscaleModelId {
  const raw = readEnv(ImageEnvVar.UpscaleModel, source)
  if (!raw) return ImageUpscaleModelId.TopazImageUpscale
  const normalized = normalizeUpscaleToken(raw)
  if (!UPSCALE_MODELS.has(normalized)) return ImageUpscaleModelId.TopazImageUpscale
  if (normalized === ImageUpscaleModelId.ClarityUpscale) return ImageUpscaleModelId.ClarityUpscale
  if (normalized === ImageUpscaleModelId.Midjourney) return ImageUpscaleModelId.Midjourney
  return ImageUpscaleModelId.TopazImageUpscale
}

function normalizeUpscaleModeToken(raw: string): string {
  return raw.trim().toLowerCase()
}

/** Canvas tile upscale is always Topaz; this picks Standard V2 vs High Fidelity V2. */
export function resolveImageUpscaleMode(
  source?: Record<string, string | undefined>,
): ImageUpscaleMode {
  const raw = readEnv(ImageEnvVar.UpscaleMode, source)
  if (!raw) return ImageUpscaleMode.Standard
  const normalized = normalizeUpscaleModeToken(raw)
  if (normalized === ImageUpscaleMode.Creative) return ImageUpscaleMode.Creative
  return ImageUpscaleMode.Standard
}

function parseImageFidelityMode(raw: string): ImageFidelityMode | undefined {
  const value = raw.trim().toLowerCase()
  switch (value) {
    case ImageFidelityMode.Standard:
      return ImageFidelityMode.Standard
    case ImageFidelityMode.Creative:
      return ImageFidelityMode.Creative
    case ImageFidelityMode.LowResolution:
      return ImageFidelityMode.LowResolution
    case ImageFidelityMode.Cgi:
      return ImageFidelityMode.Cgi
    case ImageFidelityMode.TextRefine:
      return ImageFidelityMode.TextRefine
    case ImageFidelityMode.Redefine:
    case ImageFidelityModeAlias.Wonder:
    case ImageFidelityModeAlias.Wonder35:
    case ImageFidelityModeAlias.Wonder35Compact:
    case ImageFidelityModeAlias.Wonder35Spaced:
      return ImageFidelityMode.Redefine
    default:
      return undefined
  }
}

/** Used when IMAGE_FIDELITY_MODEL is Topaz; picks Apiframe model_type. */
export function resolveImageFidelityMode(
  source?: Record<string, string | undefined>,
): ImageFidelityMode {
  const raw = readEnv(ImageEnvVar.FidelityMode, source)
  if (!raw) return ImageFidelityMode.Redefine
  return parseImageFidelityMode(raw) ?? ImageFidelityMode.Redefine
}

/** Maps IMAGE_UPSCALE_MODEL → UpscaleProvider wire ids used by /api/trigger-upscale. */
export function upscaleModelIdToProvider(model: ImageUpscaleModelId): ImageGenProvider {
  switch (model) {
    case ImageUpscaleModelId.ClarityUpscale:
      return ImageGenProvider.Replicate
    case ImageUpscaleModelId.Midjourney:
      return ImageGenProvider.Midjourney
    case ImageUpscaleModelId.TopazImageUpscale:
    default:
      return ImageGenProvider.Stability
  }
}

export function upscaleModelIdToApiframeModel(
  model: ImageUpscaleModelId,
): ApiframeUpscaleModel | null {
  switch (model) {
    case ImageUpscaleModelId.ClarityUpscale:
      return ApiframeUpscaleModel.ClarityUpscale
    case ImageUpscaleModelId.TopazImageUpscale:
      return ApiframeUpscaleModel.TopazImageUpscale
    case ImageUpscaleModelId.Midjourney:
      return null
  }
}

export function resolveDefaultUpscaleProvider(
  source?: Record<string, string | undefined>,
): ImageGenProvider {
  return upscaleModelIdToProvider(resolveUpscaleModelId(source))
}

export function resolveRepaintModel(
  source?: Record<string, string | undefined>,
): ApiframeEditModel {
  const raw = readEnv(ImageEnvVar.RepaintModel, source)
  if (!raw) return ApiframeEditModel.FluxFillPro
  const normalized = raw.trim().toLowerCase()
  if (!REPAINT_MODELS.has(normalized)) return ApiframeEditModel.FluxFillPro
  return ApiframeEditModel.FluxFillPro
}

export function hasApiframeApiKey(source?: Record<string, string | undefined>): boolean {
  return Boolean(readEnv(ImageEnvVar.ApiKey, source))
}

export function readApiframeApiKey(source?: Record<string, string | undefined>): string | undefined {
  return readEnv(ImageEnvVar.ApiKey, source)
}

const APIFRAME_KEY_PREFIX = 'afk_'

/**
 * Prefer server `APIFRAME_API_KEY`. Only accept a client-supplied key when it
 * looks like an Apiframe key — never a stale LegNext / other provider key.
 */
export function resolveApiframeApiKey(clientKey?: string | null): string | undefined {
  const fromEnv = readApiframeApiKey()
  if (fromEnv) return fromEnv
  const trimmed = clientKey?.trim()
  if (trimmed?.startsWith(APIFRAME_KEY_PREFIX)) return trimmed
  return undefined
}
