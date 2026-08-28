import { z } from 'zod'
import { OWNED_PAYLOAD_SHAPE } from '@/shared/jobs/submission-nonce'
import { logger, metadata } from '@trigger.dev/sdk/v3'
import { generateApiframeImage } from '@/shared/ai/apiframe'
import { buildGenerateBody } from '@/shared/ai/apiframe-generate-body'
import { ApiframeErrorMessage } from '@/shared/ai/constants/apiframe'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import { readApiframeApiKey, resolveRepaintModel } from '@/shared/ai/image-model-env'
import { API_ERROR, TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import {
  RepaintUploadPrefix,
  buildRepaintPrompt,
} from '@/shared/data/constants/repaint-gemini'
import { BufferEncoding, ContentType, UrlScheme } from '@/shared/data/constants/protocol'
import { storageService } from '@/shared/data/storage/storage-service'
import { getErrorMessage } from '@/shared/errors/error-utils'
import {
  logLLMRequestComplete,
  logLLMRequestError,
  logLLMRequestStart,
} from '@/trigger/utils/llm-logger'

export enum RepaintRunMetadata {
  Prompt = 'prompt',
  UserPrompt = 'userPrompt',
  ProjectId = 'projectId',
  Model = 'model',
  ImageUrl = 'imageUrl',
  MaskUrl = 'maskUrl',
  JobId = 'apiframe_job_id',
}

export enum RepaintRunError {
  UploadFailedPrefix = 'Failed to upload',
  UploadFailedSuffix = 'for Apiframe generate',
  DownloadFailedPrefix = 'Failed to download Apiframe generate result:',
}

export enum RepaintRunLog {
  Starting = 'Starting tile repaint',
  AssetsUploaded = 'Repaint assets uploaded',
  ApiframeResult = 'Apiframe generate result',
}

const REPAINT_APIFRAME_MAX_ATTEMPTS = 90

export const repaintTilePayloadSchema = z.object({
  ...OWNED_PAYLOAD_SHAPE,
  base64Image: z.string().min(1),
  maskBase64: z.string().min(1),
  prompt: z.string().optional(),
  styleReferenceUrls: z.array(z.string()).optional(),
})

export type RepaintTilePayload = z.infer<typeof repaintTilePayloadSchema>

export interface RepaintTileOutput {
  imageBase64: string
}

function toDataUrl(base64: string): string {
  if (base64.startsWith(UrlScheme.Data)) return base64
  return `${UrlScheme.Data}${ContentType.Png};${BufferEncoding.Base64},${base64}`
}

async function uploadRepaintAsset(prefix: string, base64: string): Promise<string> {
  const { v4: uuidv4 } = await import('uuid')
  const filename = `${prefix}_${uuidv4()}.png`
  const url = await storageService.uploadPublicImage(filename, toDataUrl(base64))
  if (!url) {
    throw new Error(
      `${RepaintRunError.UploadFailedPrefix} ${prefix} ${RepaintRunError.UploadFailedSuffix}`,
    )
  }
  return url
}

async function generateRepaintWithLlmLog(input: {
  apiKey: string
  projectId: string
  userPrompt: string
  prompt: string
  imageUrl: string
  maskUrl: string
}): Promise<{ imageUrl: string; jobId: string }> {
  const model = resolveRepaintModel()
  const inputImageUrls = [input.imageUrl, input.maskUrl]
  const requestBody = buildGenerateBody({
    model,
    prompt: input.prompt,
    imageInputUrls: inputImageUrls,
  })

  await metadata.set(RepaintRunMetadata.Model, model)
  await metadata.set(RepaintRunMetadata.ImageUrl, input.imageUrl)
  await metadata.set(RepaintRunMetadata.MaskUrl, input.maskUrl)

  logLLMRequestStart({
    provider: ImageGenProvider.Apiframe,
    model,
    prompt: input.prompt,
    inputImageUrls,
    input: requestBody,
    metadata: {
      task: TRIGGER_TASK_ID.REPAINT_TILE,
      projectId: input.projectId,
      userPrompt: input.userPrompt,
    },
  })

  try {
    const result = await generateApiframeImage({
      apiKey: input.apiKey,
      model,
      prompt: input.prompt,
      imageInputUrls: inputImageUrls,
      maxAttempts: REPAINT_APIFRAME_MAX_ATTEMPTS,
    })
    const imageUrl = result.images[0]
    if (!imageUrl) throw new Error(ApiframeErrorMessage.NoImages)
    await metadata.set(RepaintRunMetadata.JobId, result.jobId)
    logLLMRequestComplete({
      provider: ImageGenProvider.Apiframe,
      model,
      prompt: input.prompt,
      outputImageUrls: [imageUrl],
      output: { jobId: result.jobId, imageUrl },
    })
    return { imageUrl, jobId: result.jobId }
  } catch (error: unknown) {
    logLLMRequestError({
      provider: ImageGenProvider.Apiframe,
      model,
      prompt: input.prompt,
      input: requestBody,
      error: getErrorMessage(error),
    })
    throw error
  }
}

export async function runRepaintTile(payload: RepaintTilePayload): Promise<RepaintTileOutput> {
  const apiKey = readApiframeApiKey()
  if (!apiKey) {
    throw new Error(API_ERROR.APIFRAME_API_KEY_NOT_PROVIDED)
  }

  const userPrompt = payload.prompt?.trim() ?? ''
  const finalPrompt = buildRepaintPrompt(payload.prompt, payload.styleReferenceUrls)

  await metadata.set(RepaintRunMetadata.ProjectId, payload.projectId)
  await metadata.set(RepaintRunMetadata.UserPrompt, userPrompt)
  await metadata.set(RepaintRunMetadata.Prompt, finalPrompt)
  logger.info(RepaintRunLog.Starting, {
    projectId: payload.projectId,
    userPrompt,
    prompt: finalPrompt,
    model: resolveRepaintModel(),
  })

  const [imageUrl, maskUrl] = await Promise.all([
    uploadRepaintAsset(RepaintUploadPrefix.Image, payload.base64Image),
    uploadRepaintAsset(RepaintUploadPrefix.Mask, payload.maskBase64),
  ])

  logger.info(RepaintRunLog.AssetsUploaded, { imageUrl, maskUrl, prompt: finalPrompt })

  const result = await generateRepaintWithLlmLog({
    apiKey,
    projectId: payload.projectId,
    userPrompt,
    prompt: finalPrompt,
    imageUrl,
    maskUrl,
  })

  logger.info(RepaintRunLog.ApiframeResult, { imageUrl: result.imageUrl, jobId: result.jobId })

  const response = await fetch(result.imageUrl)
  if (!response.ok) {
    throw new Error(`${RepaintRunError.DownloadFailedPrefix} ${response.status}`)
  }

  const imageBase64 = Buffer.from(await response.arrayBuffer()).toString(BufferEncoding.Base64)
  return { imageBase64 }
}
