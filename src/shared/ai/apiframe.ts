import { recordFromJson } from '@/shared/data/deep-merge'
import { ContentType, HttpMethod } from '@/shared/data/constants/protocol'
import {
  APIFRAME_API_BASE_URL,
  APIFRAME_ASPECT_RATIO_PATTERN,
  APIFRAME_HEADER_API_KEY,
  ApiframeApiPath,
  ApiframeEditModel,
  ApiframeErrorMessage,
  ApiframeFluxFillMode,
  ApiframeImageModel,
  ApiframeJobStatus,
  ApiframeMidjourneyAction,
  APIFRAME_NANO_BANANA_PRO_TOKEN,
  ApiframeImageField,
  ApiframeJobLabel,
  ApiframeParamsKey,
  ApiframeUpscaleModel,
} from '@/shared/ai/constants/apiframe'

export interface ApiframeImageResult {
  images: string[]
  gridUrl?: string
}

export interface ApiframeJob {
  id: string
  status: string
  progress: number | null
  result: ApiframeImageResult | null
  error: string | null
}

export interface ApiframeGenerateOptions {
  model: ApiframeImageModel
  prompt: string
  apiKey: string
  aspectRatio?: string
  imageInputUrls?: string[]
  maxAttempts?: number
  intervalMs?: number
}

function apiframeUrl(path: string): string {
  return `${APIFRAME_API_BASE_URL}${path}`
}

function apiframeHeaders(apiKey: string): HeadersInit {
  return {
    [APIFRAME_HEADER_API_KEY]: apiKey,
    'Content-Type': ContentType.Json,
  }
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

function parseJobAccepted(value: unknown): string {
  const record = recordFromJson(value)
  const jobId = readString(record.jobId)
  if (!jobId) {
    throw new Error(`${ApiframeErrorMessage.NoJobId} - ${JSON.stringify(value)}`)
  }
  return jobId
}

function parseImageResult(value: unknown): ApiframeImageResult | null {
  if (value === null || value === undefined) return null
  const record = recordFromJson(value)
  const images = readStringArray(record.images)
  const gridUrl = readString(record.gridUrl)
  if (images.length === 0 && !gridUrl) return null
  return gridUrl ? { images, gridUrl } : { images }
}

function parseJob(value: unknown): ApiframeJob {
  const record = recordFromJson(value)
  const id = readString(record.id)
  if (!id) {
    throw new Error(`Apiframe job missing id: ${JSON.stringify(value)}`)
  }
  return {
    id,
    status: readString(record.status) ?? ApiframeJobStatus.Queued,
    progress: typeof record.progress === 'number' ? record.progress : null,
    result: parseImageResult(record.result),
    error: readString(record.error) ?? null,
  }
}

async function postApiframeJob(
  path: ApiframeApiPath,
  apiKey: string,
  body: Record<string, unknown>,
  label: string,
): Promise<string> {
  const response = await fetch(apiframeUrl(path), {
    method: HttpMethod.Post,
    headers: apiframeHeaders(apiKey),
    body: JSON.stringify(body),
  })
  const data: unknown = await response.json()
  if (!response.ok) {
    throw new Error(`Apiframe ${label} failed: ${response.status} - ${JSON.stringify(data)}`)
  }
  return parseJobAccepted(data)
}

export function extractApiframeAspectRatio(prompt: string): string | undefined {
  const match = APIFRAME_ASPECT_RATIO_PATTERN.exec(prompt)
  return match?.[1]
}

function optionalAspectAndImages(
  aspectRatio: string | undefined,
  imageInputUrls: string[] | undefined,
  imageField: ApiframeImageField.ImageInput | ApiframeImageField.ImagePrompt,
): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  if (aspectRatio) params[ApiframeImageField.AspectRatio] = aspectRatio
  if (imageInputUrls && imageInputUrls.length > 0) {
    params[imageField] =
      imageField === ApiframeImageField.ImagePrompt ? imageInputUrls[0] : imageInputUrls
  }
  return params
}

function attachParamsIfPresent(
  body: Record<string, unknown>,
  key: ApiframeParamsKey,
  params: Record<string, unknown>,
): void {
  if (Object.keys(params).length > 0) body[key] = params
}

function buildGenerateBody(options: {
  model: ApiframeImageModel
  prompt: string
  aspectRatio?: string
  imageInputUrls?: string[]
}): Record<string, unknown> {
  const { model, prompt, aspectRatio, imageInputUrls } = options
  const body: Record<string, unknown> = { model, prompt }

  switch (model) {
    case ApiframeImageModel.Midjourney: {
      const ar = aspectRatio ?? extractApiframeAspectRatio(prompt)
      if (ar) body[ApiframeParamsKey.Midjourney] = { aspect_ratio: ar }
      return body
    }
    case ApiframeImageModel.NanoBanana:
    case ApiframeImageModel.NanoBananaPro:
      attachParamsIfPresent(
        body,
        ApiframeParamsKey.NanoBanana,
        optionalAspectAndImages(aspectRatio, imageInputUrls, ApiframeImageField.ImageInput),
      )
      return body
    case ApiframeImageModel.GrokImagineImage:
      attachParamsIfPresent(
        body,
        ApiframeParamsKey.GrokImagine,
        optionalAspectAndImages(aspectRatio, imageInputUrls, ApiframeImageField.ImageInput),
      )
      return body
    case ApiframeImageModel.GptImage15:
      attachParamsIfPresent(
        body,
        ApiframeParamsKey.GptImage,
        optionalAspectAndImages(aspectRatio, imageInputUrls, ApiframeImageField.ImageInput),
      )
      return body
    case ApiframeImageModel.Flux2Pro:
      attachParamsIfPresent(
        body,
        ApiframeParamsKey.Flux,
        optionalAspectAndImages(aspectRatio, imageInputUrls, ApiframeImageField.ImagePrompt),
      )
      return body
    default:
      return body
  }
}

export async function submitImageGenerate(
  options: Omit<ApiframeGenerateOptions, 'maxAttempts' | 'intervalMs'>,
): Promise<string> {
  return postApiframeJob(
    ApiframeApiPath.ImagesGenerate,
    options.apiKey,
    buildGenerateBody(options),
    ApiframeJobLabel.Generate,
  )
}

export async function submitImageUpscale(input: {
  apiKey: string
  model: ApiframeUpscaleModel
  imageUrl: string
  prompt?: string
  upscaleFactor?: 2 | 4
}): Promise<string> {
  const body: Record<string, unknown> = { model: input.model }
  if (input.model === ApiframeUpscaleModel.TopazImageUpscale) {
    body[ApiframeParamsKey.TopazUpscale] = {
      image: input.imageUrl,
      upscale_factor: input.upscaleFactor ?? 2,
    }
  } else {
    const clarity: Record<string, unknown> = { image: input.imageUrl }
    if (input.prompt) clarity.prompt = input.prompt
    if (input.upscaleFactor) clarity.scale_factor = input.upscaleFactor
    body[ApiframeParamsKey.ClarityUpscale] = clarity
  }
  return postApiframeJob(
    ApiframeApiPath.ImagesUpscale,
    input.apiKey,
    body,
    ApiframeJobLabel.Upscale,
  )
}

export async function submitImageEdit(input: {
  apiKey: string
  imageUrl: string
  prompt: string
  maskUrl?: string
  mode?: ApiframeFluxFillMode
}): Promise<string> {
  const fluxFill: Record<string, unknown> = {
    image: input.imageUrl,
    prompt: input.prompt,
    mode: input.mode ?? ApiframeFluxFillMode.Inpaint,
  }
  if (input.maskUrl) fluxFill.mask = input.maskUrl
  return postApiframeJob(
    ApiframeApiPath.ImagesEdit,
    input.apiKey,
    {
      model: ApiframeEditModel.FluxFillPro,
      [ApiframeParamsKey.FluxFill]: fluxFill,
    },
    ApiframeJobLabel.Edit,
  )
}

export async function submitMidjourneyImagine(
  prompt: string,
  apiKey: string,
  aspectRatio?: string,
): Promise<string> {
  return submitImageGenerate({
    model: ApiframeImageModel.Midjourney,
    prompt,
    apiKey,
    aspectRatio,
  })
}

export async function submitMidjourneyUpsample(
  parentJobId: string,
  index: 1 | 2 | 3 | 4,
  apiKey: string,
): Promise<string> {
  return postApiframeJob(
    ApiframeApiPath.ImagesMidjourneyAction,
    apiKey,
    {
      action: ApiframeMidjourneyAction.Upsample,
      parentJobId,
      index,
    },
    ApiframeJobLabel.Upsample,
  )
}

export async function fetchApiframeJob(jobId: string, apiKey: string): Promise<ApiframeJob> {
  const response = await fetch(apiframeUrl(`${ApiframeApiPath.Jobs}/${jobId}`), {
    method: HttpMethod.Get,
    headers: { [APIFRAME_HEADER_API_KEY]: apiKey },
  })
  if (!response.ok) {
    throw new Error(`Apiframe polling failed: ${response.status} - ${await response.text()}`)
  }
  return parseJob(await response.json())
}

export async function pollApiframeJob(
  jobId: string,
  apiKey: string,
  maxAttempts = 90,
  intervalMs = 2000,
): Promise<ApiframeImageResult> {
  for (let i = 0; i < maxAttempts; i++) {
    const job = await fetchApiframeJob(jobId, apiKey)
    if (job.status === ApiframeJobStatus.Completed) {
      if (!job.result || (job.result.images.length === 0 && !job.result.gridUrl)) {
        throw new Error(ApiframeErrorMessage.NoImages)
      }
      return job.result
    }
    if (
      job.status === ApiframeJobStatus.Failed ||
      job.status === ApiframeJobStatus.Cancelled
    ) {
      throw new Error(
        `${ApiframeErrorMessage.JobFailed}: ${job.error ?? ApiframeErrorMessage.JobFailed}`,
      )
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
  throw new Error(ApiframeErrorMessage.TaskTimedOut)
}

export async function generateApiframeImage(
  options: ApiframeGenerateOptions,
): Promise<ApiframeImageResult & { jobId: string }> {
  const jobId = await submitImageGenerate(options)
  const result = await pollApiframeJob(
    jobId,
    options.apiKey,
    options.maxAttempts ?? 90,
    options.intervalMs ?? 2000,
  )
  return { ...result, jobId }
}

export async function generateMidjourneyImages(
  prompt: string,
  apiKey: string,
  options?: { aspectRatio?: string; maxAttempts?: number; intervalMs?: number },
): Promise<ApiframeImageResult & { jobId: string }> {
  return generateApiframeImage({
    model: ApiframeImageModel.Midjourney,
    prompt,
    apiKey,
    aspectRatio: options?.aspectRatio,
    maxAttempts: options?.maxAttempts,
    intervalMs: options?.intervalMs,
  })
}

export async function generateMidjourneyUpscaledImage(
  prompt: string,
  apiKey: string,
  options?: { aspectRatio?: string; index?: 1 | 2 | 3 | 4; maxAttempts?: number },
): Promise<{ imageUrl: string; imagineJobId: string; upsampleJobId: string; gridUrl?: string }> {
  const imagine = await generateMidjourneyImages(prompt, apiKey, {
    aspectRatio: options?.aspectRatio,
    maxAttempts: options?.maxAttempts,
  })
  const upsampleJobId = await submitMidjourneyUpsample(
    imagine.jobId,
    options?.index ?? 1,
    apiKey,
  )
  const upsampled = await pollApiframeJob(upsampleJobId, apiKey, options?.maxAttempts ?? 90)
  const imageUrl = upsampled.images[0]
  if (!imageUrl) {
    throw new Error(ApiframeErrorMessage.NoImages)
  }
  return {
    imageUrl,
    imagineJobId: imagine.jobId,
    upsampleJobId,
    gridUrl: imagine.gridUrl,
  }
}

export async function upscaleApiframeImage(input: {
  apiKey: string
  model: ApiframeUpscaleModel
  imageUrl: string
  prompt?: string
  upscaleFactor?: 2 | 4
  maxAttempts?: number
}): Promise<{ imageUrl: string; jobId: string }> {
  const jobId = await submitImageUpscale(input)
  const result = await pollApiframeJob(jobId, input.apiKey, input.maxAttempts ?? 90)
  const imageUrl = result.images[0]
  if (!imageUrl) throw new Error(ApiframeErrorMessage.NoImages)
  return { imageUrl, jobId }
}

export async function editApiframeImage(input: {
  apiKey: string
  imageUrl: string
  prompt: string
  maskUrl?: string
  mode?: ApiframeFluxFillMode
  maxAttempts?: number
}): Promise<{ imageUrl: string; jobId: string }> {
  const jobId = await submitImageEdit(input)
  const result = await pollApiframeJob(jobId, input.apiKey, input.maxAttempts ?? 90)
  const imageUrl = result.images[0]
  if (!imageUrl) throw new Error(ApiframeErrorMessage.NoImages)
  return { imageUrl, jobId }
}

export function pickApiframeImageUrl(result: ApiframeImageResult): string | null {
  return result.images[0] ?? result.gridUrl ?? null
}

export function resolveNanoBananaModel(modelId?: string): ApiframeImageModel {
  if (modelId && modelId.toLowerCase().includes(APIFRAME_NANO_BANANA_PRO_TOKEN)) {
    return ApiframeImageModel.NanoBananaPro
  }
  return ApiframeImageModel.NanoBanana
}
