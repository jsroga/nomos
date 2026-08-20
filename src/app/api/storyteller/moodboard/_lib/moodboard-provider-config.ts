import {
  imageGenerateModelToImageGenProvider,
  resolveApiframeApiKey,
  resolveMoodboardModel,
} from '@/shared/ai/image-model-env'

export function resolveMoodboardProviderConfig(
  providerConfig: Record<string, unknown> | undefined,
  source?: Record<string, string | undefined>,
) {
  const moodboardModel = resolveMoodboardModel(source)
  const clientKey = typeof providerConfig?.apiKey === 'string' ? providerConfig.apiKey : undefined
  return {
    provider: imageGenerateModelToImageGenProvider(moodboardModel),
    modelId: moodboardModel,
    apiKey: resolveApiframeApiKey(clientKey),
  }
}
