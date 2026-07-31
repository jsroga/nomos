import { TileTriggerProvider } from '@/shared/data/constants/trigger-tile-route'
import { EnvVarName } from '@/shared/data/constants/protocol'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import { LegNextModelId } from '@/shared/ai/constants/legnext'

export type TileAIProvider =
  | typeof ImageGenProvider.Gemini
  | typeof ImageGenProvider.NanoBanana
  | typeof ImageGenProvider.OpenAi
  | typeof ImageGenProvider.Stability
  | typeof ImageGenProvider.Midjourney
  | typeof ImageGenProvider.Grok
  | typeof LegNextModelId.UploadPaint

export type FollowUpImageProvider =
  | typeof TileTriggerProvider.LegnextUploadPaint
  | typeof TileTriggerProvider.NanoBanana
  | typeof TileTriggerProvider.Grok

/** Short alias some envs use for LegNext follow-up paint. */
const FOLLOW_UP_ALIAS_MIDJOURNEY = ImageGenProvider.Midjourney
const FOLLOW_UP_ALIAS_LEGNEXT = 'legnext'

interface FollowUpProviderEnv {
  FOLLOW_UP_IMAGE_PROVIDER?: string
  OPENROUTER_API_KEY?: string
}

function readFollowUpProviderEnv(env?: FollowUpProviderEnv): FollowUpProviderEnv {
  if (env) return env
  // Read keys explicitly — Next's ProcessEnv augmentation is not assignable to this slice.
  return {
    FOLLOW_UP_IMAGE_PROVIDER: process.env.FOLLOW_UP_IMAGE_PROVIDER,
    OPENROUTER_API_KEY: process.env[EnvVarName.OpenRouterApiKey],
  }
}

export function resolveFollowUpImageProviderFromEnv(
  env?: FollowUpProviderEnv
): FollowUpImageProvider {
  const source = readFollowUpProviderEnv(env)
  const configuredProvider = source.FOLLOW_UP_IMAGE_PROVIDER?.trim().toLowerCase()

  if (configuredProvider === TileTriggerProvider.Grok) {
    return TileTriggerProvider.Grok
  }

  if (
    configuredProvider === TileTriggerProvider.LegnextUploadPaint ||
    configuredProvider === FOLLOW_UP_ALIAS_MIDJOURNEY ||
    configuredProvider === FOLLOW_UP_ALIAS_LEGNEXT
  ) {
    return TileTriggerProvider.LegnextUploadPaint
  }

  if (configuredProvider === TileTriggerProvider.NanoBanana) {
    return TileTriggerProvider.NanoBanana
  }

  // Unconfigured: prefer the OpenRouter gateway, then Gemini. LegNext/Midjourney
  // is opt-in only — its tile endpoint (upload_paint) is whitelist-gated.
  return source.OPENROUTER_API_KEY?.trim()
    ? TileTriggerProvider.Grok
    : TileTriggerProvider.NanoBanana
}
