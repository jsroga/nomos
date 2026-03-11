export type FollowUpImageProvider = 'nano-banana' | 'legnext-upload-paint'
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

  if (configuredProvider === 'legnext-upload-paint' || configuredProvider === 'nano-banana') {
    return configuredProvider
  }

  // Legacy fallback for existing deployments.
  const useLegnextForFollowUp =
    env.USE_LEGNEXT_FOR_FOLLOWUP === 'true' && env.USE_NANO_BANANA_FOR_FOLLOWUP !== 'true'

  return useLegnextForFollowUp ? 'legnext-upload-paint' : 'nano-banana'
}
