import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import {
  imageGenerateModelToTileProvider,
  resolveTileFollowUpModel,
  type FollowUpImageProvider,
} from '@/shared/ai/image-model-env'
import { ImageEnvVar } from '@/shared/ai/constants/image-env'

export type TileAIProvider =
  | typeof ImageGenProvider.Gemini
  | typeof ImageGenProvider.NanoBanana
  | typeof ImageGenProvider.OpenAi
  | typeof ImageGenProvider.Stability
  | typeof ImageGenProvider.Midjourney
  | typeof ImageGenProvider.Grok

export type { FollowUpImageProvider }

type FollowUpProviderEnv = Partial<Record<ImageEnvVar, string | undefined>>

function readFollowUpProviderEnv(env?: FollowUpProviderEnv): Record<string, string | undefined> {
  if (env) return env
  return {
    [ImageEnvVar.TileFollowUpModel]: process.env[ImageEnvVar.TileFollowUpModel],
    [ImageEnvVar.LegacyFollowUpProvider]: process.env[ImageEnvVar.LegacyFollowUpProvider],
    [ImageEnvVar.LegacyFollowUpModel]: process.env[ImageEnvVar.LegacyFollowUpModel],
    [ImageEnvVar.ApiKey]: process.env[ImageEnvVar.ApiKey],
  }
}

/** Prefer IMAGE_TILE_FOLLOW_UP_MODEL; accepts legacy FOLLOW_UP_IMAGE_PROVIDER. */
export function resolveFollowUpImageProviderFromEnv(
  env?: FollowUpProviderEnv,
): FollowUpImageProvider {
  const source = readFollowUpProviderEnv(env)
  const model = resolveTileFollowUpModel(source)
  return imageGenerateModelToTileProvider(model)
}
