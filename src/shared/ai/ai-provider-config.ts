import { readString, recordFromJson } from '@/shared/data/json-guards'

export interface AiProviderConfig {
  apiKey: string
  model?: string
  params?: { modelId?: string }
}

export function aiProviderConfigFromRecord(config: Record<string, unknown>): AiProviderConfig {
  const apiKey = readString(config.apiKey)
  if (!apiKey) {
    throw new Error('Missing aiConfig.apiKey')
  }
  const params = recordFromJson(config.params)
  const modelId = readString(params.modelId)
  return {
    apiKey,
    model: readString(config.model),
    params: modelId ? { modelId } : undefined,
  }
}
