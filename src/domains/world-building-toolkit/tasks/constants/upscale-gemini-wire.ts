export const UpscaleGeminiStage = {
  GeminiUpscale: 'gemini_upscale',
} as const

export const UpscaleTaskMetadataKey = {
  Stage: 'stage',
  Progress: 'progress',
} as const

export const UpscaleGeminiStyleRefJoin = ', '

export const UpscaleGeminiLogMessage = {
  Step1Start: 'Step 1: Upscaling with Gemini',
  Step1Complete: 'Gemini Step 1 upscale completed',
} as const

export const UpscaleGeminiErrorMessage = {
  NoCandidates: 'Gemini Step 1: No candidates returned',
  NoImageInResponse: 'Gemini Step 1: No image in response',
  NoImageData: 'Gemini Step 1: No image data in response',
  RequestFailed: 'Gemini Step 1 failed',
} as const

export const UpscaleGeminiDefaultModel = 'gemini-3-pro-image-preview'
export const UpscaleGeminiDefaultMimeType = 'image/png'
export const UpscaleGeminiApiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/models'
export const UpscaleGeminiGenerateContentAction = 'generateContent'
export const UpscaleGeminiHttpContentType = 'application/json'
export const UpscaleGeminiHttpMethod = 'POST'
export const UpscaleGeminiResponseModalityText = 'TEXT'
export const UpscaleGeminiResponseModalityImage = 'IMAGE'
export const UpscaleGeminiInlineFieldMimeType = 'mime_type'
export const UpscaleGeminiInlineFieldMimeTypeAlt = 'mimeType'
export const UpscaleGeminiInlineFieldData = 'data'
export const UpscaleGeminiCandidatesField = 'candidates'
export const UpscaleGeminiContentField = 'content'
export const UpscaleGeminiPartsField = 'parts'
export const UpscaleGeminiProgressAfterStep = 30
export const UpscaleGeminiStyleRefPrefix = ' Use these style references for visual guidance: '
export const UpscaleGeminiStyleRefSuffix = '.'
export const UpscaleGeminiBase64DataUrlPattern = /^data:image\/\w+;base64,/
