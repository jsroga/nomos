import { recordFromJson } from '@/shared/data/deep-merge'
import { ContentType, HttpMethod } from '@/shared/data/constants/protocol'
import {
  APIFRAME_API_BASE_URL,
  APIFRAME_HEADER_API_KEY,
  APIFRAME_VIDEO_POLL_ATTEMPTS,
  APIFRAME_VIDEO_POLL_INTERVAL_MS,
  ApiframeApiPath,
  ApiframeErrorMessage,
  ApiframeGenerateAspectRatio,
  ApiframeJobLabel,
  ApiframeJobStatus,
  ApiframeKlingMode,
  ApiframeKlingParam,
  ApiframeParamsKey,
  ApiframeSeedanceParam,
  ApiframeSeedanceResolution,
  ApiframeVideoField,
  ApiframeVideoModel,
  KlingMultiPromptField,
} from '@/shared/ai/constants/apiframe'

export interface ApiframeVideoJobProgress {
  jobId: string
  attempt: number
  maxAttempts: number
  status: string
}

export interface KlingMultiPromptShot {
  prompt: string
  duration: number
}

export interface ApiframeVideoGenerateOptions {
  apiKey: string
  prompt: string
  startImageUrl: string
  model?: ApiframeVideoModel
  duration: number
  aspectRatio?: string
  generateAudio?: boolean
  negativePrompt?: string
  multiPrompt?: KlingMultiPromptShot[]
  maxAttempts?: number
  intervalMs?: number
  onJobAccepted?: (jobId: string) => void | Promise<void>
  onPoll?: (progress: ApiframeVideoJobProgress) => void | Promise<void>
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

function parseJobAccepted(value: unknown): string {
  const record = recordFromJson(value)
  const jobId = readString(record.jobId)
  if (!jobId) {
    throw new Error(`${ApiframeErrorMessage.NoJobId} - ${JSON.stringify(value)}`)
  }
  return jobId
}

export function pickApiframeVideoUrl(result: unknown): string | undefined {
  const record = recordFromJson(result)
  return (
    readString(record[ApiframeVideoField.VideoUrl]) ??
    readString(record[ApiframeVideoField.VideoUrlSnake])
  )
}

export function klingMultiPromptRecords(shots: KlingMultiPromptShot[]): Record<string, unknown>[] {
  return shots.map(shot => ({
    [KlingMultiPromptField.Prompt]: shot.prompt,
    [KlingMultiPromptField.Duration]: shot.duration,
  }))
}

/** Apiframe Zod-types `klingParams.multi_prompt` as a JSON string, not a native array. */
export function klingMultiPromptJson(shots: KlingMultiPromptShot[]): string {
  return JSON.stringify(klingMultiPromptRecords(shots))
}

export function buildKlingGenerateBody(options: ApiframeVideoGenerateOptions): Record<string, unknown> {
  const klingParams: Record<string, unknown> = {
    [ApiframeKlingParam.StartImage]: options.startImageUrl,
    [ApiframeKlingParam.Duration]: options.duration,
    [ApiframeKlingParam.Mode]: ApiframeKlingMode.Pro,
    [ApiframeKlingParam.AspectRatio]:
      options.aspectRatio ?? ApiframeGenerateAspectRatio.Widescreen,
    [ApiframeKlingParam.GenerateAudio]: options.generateAudio !== false,
  }
  if (options.negativePrompt) {
    klingParams[ApiframeKlingParam.NegativePrompt] = options.negativePrompt
  }
  if (options.multiPrompt && options.multiPrompt.length > 0) {
    klingParams[ApiframeKlingParam.MultiPrompt] = klingMultiPromptJson(options.multiPrompt)
  }
  return {
    prompt: options.prompt,
    model: options.model ?? ApiframeVideoModel.Kling30,
    [ApiframeParamsKey.Kling]: klingParams,
  }
}

export function buildSeedanceGenerateBody(
  options: ApiframeVideoGenerateOptions,
): Record<string, unknown> {
  return {
    prompt: options.prompt,
    model: ApiframeVideoModel.Seedance25,
    [ApiframeParamsKey.Seedance]: {
      [ApiframeSeedanceParam.StartImage]: options.startImageUrl,
      [ApiframeSeedanceParam.Duration]: options.duration,
      [ApiframeSeedanceParam.Resolution]: ApiframeSeedanceResolution.P720,
      [ApiframeSeedanceParam.AspectRatio]:
        options.aspectRatio ?? ApiframeGenerateAspectRatio.Widescreen,
      [ApiframeSeedanceParam.GenerateAudio]: options.generateAudio !== false,
    },
  }
}

export function buildVideoGenerateBody(
  options: ApiframeVideoGenerateOptions,
): Record<string, unknown> {
  if (options.model === ApiframeVideoModel.Seedance25) {
    return buildSeedanceGenerateBody(options)
  }
  return buildKlingGenerateBody(options)
}

async function submitVideoGenerate(options: ApiframeVideoGenerateOptions): Promise<string> {
  const response = await fetch(apiframeUrl(ApiframeApiPath.VideosGenerate), {
    method: HttpMethod.Post,
    headers: apiframeHeaders(options.apiKey),
    body: JSON.stringify(buildVideoGenerateBody(options)),
  })
  const data: unknown = await response.json()
  if (!response.ok) {
    throw new Error(
      `Apiframe ${ApiframeJobLabel.GenerateVideo} failed: ${response.status} - ${JSON.stringify(data)}`,
    )
  }
  return parseJobAccepted(data)
}

async function fetchApiframeVideoJob(
  jobId: string,
  apiKey: string,
): Promise<{ status: string; error: string | null; result: unknown }> {
  const response = await fetch(apiframeUrl(`${ApiframeApiPath.Jobs}/${jobId}`), {
    method: HttpMethod.Get,
    headers: { [APIFRAME_HEADER_API_KEY]: apiKey },
  })
  if (!response.ok) {
    throw new Error(`Apiframe polling failed: ${response.status} - ${await response.text()}`)
  }
  const record = recordFromJson(await response.json())
  return {
    status: readString(record.status) ?? ApiframeJobStatus.Queued,
    error: readString(record.error) ?? null,
    result: record.result,
  }
}

export async function pollApiframeVideoJob(
  jobId: string,
  apiKey: string,
  maxAttempts = APIFRAME_VIDEO_POLL_ATTEMPTS,
  intervalMs = APIFRAME_VIDEO_POLL_INTERVAL_MS,
  onPoll?: (progress: ApiframeVideoJobProgress) => void | Promise<void>,
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const job = await fetchApiframeVideoJob(jobId, apiKey)
    await onPoll?.({
      jobId,
      attempt: i + 1,
      maxAttempts,
      status: job.status,
    })
    if (job.status === ApiframeJobStatus.Completed) {
      const videoUrl = pickApiframeVideoUrl(job.result)
      if (!videoUrl) throw new Error(ApiframeErrorMessage.NoVideo)
      return videoUrl
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

export async function generateApiframeVideo(
  options: ApiframeVideoGenerateOptions,
): Promise<{ videoUrl: string; jobId: string }> {
  const jobId = await submitVideoGenerate(options)
  await options.onJobAccepted?.(jobId)
  const videoUrl = await pollApiframeVideoJob(
    jobId,
    options.apiKey,
    options.maxAttempts,
    options.intervalMs,
    options.onPoll,
  )
  return { videoUrl, jobId }
}
