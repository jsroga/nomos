export enum ApiframeJobStatus {
  Queued = 'QUEUED',
  Processing = 'PROCESSING',
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Cancelled = 'CANCELLED',
}

/** Models used by this app on POST /v2/images/generate */
export enum ApiframeImageModel {
  Midjourney = 'midjourney',
  NanoBanana = 'nano-banana',
  NanoBananaPro = 'nano-banana-pro',
  GrokImagineImage = 'grok-imagine-image',
  GptImage15 = 'gpt-image-1.5',
  Flux2Pro = 'flux-2-pro',
}

export enum ApiframeUpscaleModel {
  TopazImageUpscale = 'topaz-image-upscale',
  ClarityUpscale = 'clarity-upscale',
}

export enum ApiframeEditModel {
  FluxFillPro = 'flux-fill-pro',
}

export enum ApiframeFluxFillMode {
  Inpaint = 'inpaint',
  Outpaint = 'outpaint',
}

export enum ApiframeMidjourneyAction {
  Upsample = 'upsample',
  Variation = 'variation',
  Inpaint = 'inpaint',
  Outpaint = 'outpaint',
  Pan = 'pan',
}

export enum ApiframeErrorMessage {
  TaskTimedOut = 'Apiframe task timed out',
  NoJobId = 'Apiframe did not return a jobId',
  NoImages = 'Apiframe result missing images',
  JobFailed = 'Apiframe job failed',
}

/** Apiframe v2 — https://apiframe.ai/docs */
export const APIFRAME_API_BASE_URL = 'https://api.apiframe.ai/v2'

export const APIFRAME_HEADER_API_KEY = 'X-API-Key'

export enum ApiframeApiPath {
  ImagesGenerate = '/images/generate',
  ImagesUpscale = '/images/upscale',
  ImagesEdit = '/images/edit',
  ImagesMidjourneyAction = '/images/midjourney/action',
  Jobs = '/jobs',
}

export const APIFRAME_ASPECT_RATIO_PATTERN = /--ar\s+(\d+:\d+)/i

export enum ApiframeParamsKey {
  Midjourney = 'midjourneyParams',
  NanoBanana = 'nanoBananaParams',
  GrokImagine = 'grokImagineParams',
  GptImage = 'gptImageParams',
  Flux = 'fluxParams',
  TopazUpscale = 'topazUpscaleParams',
  ClarityUpscale = 'clarityUpscaleParams',
  FluxFill = 'fluxFillParams',
}

export enum ApiframeJobLabel {
  Generate = 'generate',
  Upscale = 'upscale',
  Edit = 'edit',
  Upsample = 'upsample',
}

export const APIFRAME_NANO_BANANA_PRO_TOKEN = 'pro'

export enum ApiframeImageField {
  ImageInput = 'image_input',
  ImagePrompt = 'image_prompt',
  Image = 'image',
  AspectRatio = 'aspect_ratio',
}

/** Grok imagine allowlist; Nano Banana / GPT / Flux / MJ share this intersection. */
export enum ApiframeGenerateAspectRatio {
  Square = '1:1',
  PortraitTwoThree = '2:3',
  LandscapeThreeTwo = '3:2',
  Widescreen = '16:9',
  TallNineSixteen = '9:16',
}

export const APIFRAME_GENERATE_ASPECT_RATIOS = [
  ApiframeGenerateAspectRatio.Square,
  ApiframeGenerateAspectRatio.PortraitTwoThree,
  ApiframeGenerateAspectRatio.LandscapeThreeTwo,
  ApiframeGenerateAspectRatio.Widescreen,
  ApiframeGenerateAspectRatio.TallNineSixteen,
] as const

/** Reference-image field per model. Only ImageInput takes an array; the rest take one URL. */
export type ApiframeImageUrlField =
  | ApiframeImageField.ImageInput
  | ApiframeImageField.ImagePrompt
  | ApiframeImageField.Image

export const MIDJOURNEY_VERSION = '8.2'
