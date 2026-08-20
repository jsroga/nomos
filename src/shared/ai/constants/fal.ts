export const FAL_SAM_CALL_LOG_PREFIX = '[FalClient] Calling SAM-3 with:'
export const FAL_NONE_PLACEHOLDER = '(none)'
export const FAL_HTTP_METHOD_POST = 'POST'
export const FAL_API_ERROR_LOG_PREFIX = '[FalClient] API Error:'
export const FAL_RAW_OUTPUT_LOG_PREFIX = '[FalClient] Raw output:'

export enum FalEnvVar {
  ApiKey = 'FAL_KEY',
}

export enum FalSamPrompt {
  Object = 'object',
}

export enum FalSamEndpoint {
  ImageRle = 'https://fal.run/fal-ai/sam-3/image-rle',
}

export enum FalSamInputField {
  ImageUrl = 'image_url',
  BoxPrompts = 'box_prompts',
  ApplyMask = 'apply_mask',
  ReturnMultipleMasks = 'return_multiple_masks',
  IncludeScores = 'include_scores',
  IncludeBoxes = 'include_boxes',
  Prompt = 'prompt',
}

export function resolveSamPrompt(textPrompt?: string): string {
  const trimmed = textPrompt?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : FalSamPrompt.Object
}

export function readFalApiKey(source?: Record<string, string | undefined>): string | undefined {
  const raw = (source ?? process.env)[FalEnvVar.ApiKey]
  const trimmed = raw?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : undefined
}
