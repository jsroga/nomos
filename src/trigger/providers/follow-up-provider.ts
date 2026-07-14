import { TileTriggerProvider } from '@/shared/data/constants/trigger-tile-route'
import { AuthBypassFlag } from '@/shared/data/constants/protocol'

export type FollowUpImageProvider = `${TileTriggerProvider.LegnextUploadPaint}` | `${TileTriggerProvider.NanoBanana}`
export type TileAIProvider =
  | 'gemini'
  | 'nano-banana'
  | 'openai'
  | 'stability'
  | 'midjourney'
  | 'legnext-upload-paint'

export function resolveFollowUpImageProviderFromEnv(
  env: NodeJS.ProcessEnv = process.env
): FollowUpImageProvider {
  const configuredProvider = env.FOLLOW_UP_IMAGE_PROVIDER?.trim().toLowerCase()

  if (
    configuredProvider === TileTriggerProvider.LegnextUploadPaint ||
    configuredProvider === TileTriggerProvider.NanoBanana
  ) {
    return configuredProvider
  }

  // Legacy fallback for existing deployments.
  const useLegnextForFollowUp =
    env.USE_LEGNEXT_FOR_FOLLOWUP === AuthBypassFlag.True &&
    env.USE_NANO_BANANA_FOR_FOLLOWUP !== AuthBypassFlag.True

  return useLegnextForFollowUp
    ? TileTriggerProvider.LegnextUploadPaint
    : TileTriggerProvider.NanoBanana
}
