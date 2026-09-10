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
  GptImage2 = 'gpt-image-2',
  Flux2Pro = 'flux-2-pro',
}

export enum ApiframeUpscaleModel {
  TopazImageUpscale = 'topaz-image-upscale',
  ClarityUpscale = 'clarity-upscale',
}

/** https://apiframe.ai/models/topaz-image-upscale */
export enum ApiframeTopazModelType {
  StandardV2 = 'standard-v2',
  LowResV2 = 'low-res-v2',
  Cgi = 'cgi',
  HighFidelityV2 = 'high-fidelity-v2',
  TextRefine = 'text-refine',
  Redefine = 'redefine',
}

export enum ApiframeTopazUpscaleFactor {
  One = 1,
  Two = 2,
  Four = 4,
  Six = 6,
}

export enum ApiframeTopazOutputFormat {
  Png = 'png',
  Jpg = 'jpg',
}

export enum ApiframeTopazParam {
  Image = 'image',
  UpscaleFactor = 'upscale_factor',
  ModelType = 'model_type',
  FaceEnhance = 'face_enhance',
  OutputFormat = 'output_format',
}

export enum ApiframeEditModel {
  FluxFillPro = 'flux-fill-pro',
}

export enum ApiframeFluxFillMode {
  Inpaint = 'inpaint',
  Outpaint = 'outpaint',
}

/** Apiframe Flux Fill `guidance`; allowed range 2–5. */
export const APIFRAME_FLUX_FILL_GUIDANCE = 5

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
  NoVideo = 'Apiframe result missing videoUrl',
  JobFailed = 'Apiframe job failed',
}

export enum ApiframeJobErrorMatch {
  ImageDenied = 'Image denied',
  ImageFilters = 'image filters',
}

export const APIFRAME_IMAGE_FILTER_RETRY_MAX = 3

/** Apiframe v2 — https://apiframe.ai/docs */
export const APIFRAME_API_BASE_URL = 'https://api.apiframe.ai/v2'

export const APIFRAME_HEADER_API_KEY = 'X-API-Key'

export enum ApiframeApiPath {
  ImagesGenerate = '/images/generate',
  ImagesUpscale = '/images/upscale',
  ImagesEdit = '/images/edit',
  ImagesMidjourneyAction = '/images/midjourney/action',
  VideosGenerate = '/videos/generate',
  Jobs = '/jobs',
}

export const APIFRAME_ASPECT_RATIO_PATTERN = /--ar\s+(\d+:\d+)/i

export enum ApiframeParamsKey {
  Midjourney = 'midjourneyParams',
  NanoBanana = 'nanoBananaParams',
  GrokImagine = 'grokImagineParams',
  GptImage = 'gptImageParams',
  GptImage2 = 'gptImage2Params',
  Flux = 'fluxParams',
  TopazUpscale = 'topazUpscaleParams',
  ClarityUpscale = 'clarityUpscaleParams',
  FluxFill = 'fluxFillParams',
  Kling = 'klingParams',
  Seedance = 'seedanceParams',
}

export enum ApiframeJobLabel {
  Generate = 'generate',
  Upscale = 'upscale',
  Edit = 'edit',
  Upsample = 'upsample',
  GenerateVideo = 'generate-video',
}

export enum ApiframeVideoModel {
  Kling30 = 'kling-3.0',
  Seedance25 = 'seedance-2.5',
}

export function isApiframeVideoModel(value: unknown): value is ApiframeVideoModel {
  return value === ApiframeVideoModel.Kling30 || value === ApiframeVideoModel.Seedance25
}

export const STORYBOARD_VIDEO_MODELS = [
  ApiframeVideoModel.Kling30,
  ApiframeVideoModel.Seedance25,
] as const

export enum ApiframeKlingMode {
  Standard = 'standard',
  Pro = 'pro',
}

export enum ApiframeKlingParam {
  Duration = 'duration',
  AspectRatio = 'aspect_ratio',
  Mode = 'mode',
  StartImage = 'start_image',
  GenerateAudio = 'generate_audio',
  NegativePrompt = 'negative_prompt',
  MultiPrompt = 'multi_prompt',
}

/** Kling 3.0 native multi_prompt: max 6 shots, each duration 1–12s, prompt ~500 chars. */
export const KLING_MULTI_PROMPT_MAX_SHOTS = 6
export const KLING_MULTI_PROMPT_SHOT_DURATION_MIN = 1
export const KLING_MULTI_PROMPT_SHOT_DURATION_MAX = 12
export const KLING_MULTI_PROMPT_SHOT_PROMPT_MAX_CHARS = 500

export enum KlingMultiPromptField {
  Prompt = 'prompt',
  Duration = 'duration',
}

export enum ApiframeSeedanceParam {
  Duration = 'duration',
  Resolution = 'resolution',
  AspectRatio = 'aspect_ratio',
  StartImage = 'start_image',
  GenerateAudio = 'generate_audio',
}

export enum ApiframeSeedanceResolution {
  P720 = '720p',
}

export enum ApiframeVideoField {
  VideoUrl = 'videoUrl',
  VideoUrlSnake = 'video_url',
}

export const APIFRAME_VIDEO_DURATION_MIN = 3
export const APIFRAME_VIDEO_DURATION_MAX = 15
export const APIFRAME_VIDEO_DURATION_DEFAULT = 10
export const APIFRAME_SEEDANCE_DURATION_MIN = 4
export const APIFRAME_SEEDANCE_DURATION_MAX = 30
export const APIFRAME_SEEDANCE_DURATION_DEFAULT = 30
export const APIFRAME_VIDEO_PROMPT_MAX_CHARS = 4000
export const APIFRAME_VIDEO_POLL_ATTEMPTS = 120
export const APIFRAME_VIDEO_POLL_INTERVAL_MS = 4000

export const APIFRAME_NANO_BANANA_PRO_TOKEN = 'pro'

export enum ApiframeImageField {
  ImageInput = 'image_input',
  InputImages = 'input_images',
  ImagePrompt = 'image_prompt',
  Image = 'image',
  AspectRatio = 'aspect_ratio',
}

export enum ApiframeGptImage2Param {
  Quality = 'quality',
  OutputFormat = 'output_format',
}

export enum ApiframeGptImage2Quality {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Auto = 'auto',
}

export enum ApiframeGptImage2OutputFormat {
  Webp = 'webp',
  Png = 'png',
  Jpeg = 'jpeg',
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

/** Reference-image field per model. ImageInput / InputImages take a URL array; the rest take one URL. */
export type ApiframeImageUrlField =
  | ApiframeImageField.ImageInput
  | ApiframeImageField.InputImages
  | ApiframeImageField.ImagePrompt
  | ApiframeImageField.Image

export const MIDJOURNEY_VERSION = '8.2'
