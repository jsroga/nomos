import { logger, metadata } from '@trigger.dev/sdk'
import { getErrorMessage } from '@/shared/errors/error-utils'
import {
  logLLMRequestComplete,
  logLLMRequestError,
  logLLMRequestStart,
} from '@/trigger/utils/llm-logger'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import {
  generateMidjourneyImages,
  pollApiframeJob,
  submitMidjourneyUpsample,
  type ApiframeImageResult,
} from '@/shared/ai/apiframe'
import {
  ApiframeGenerateAspectRatio,
  ApiframeImageField,
  ApiframeImageModel,
} from '@/shared/ai/constants/apiframe'
import { pickPortraitVariantIndex } from '@/domains/storyteller/services/portrait-variant-llm'
import {
  PortraitVariantCopy,
  PortraitVariantIndex,
} from '@/domains/storyteller/services/constants/portrait-variant'
import {
  GeneratePortraitError,
  GeneratePortraitLog,
  GeneratePortraitMetadataKey,
  GeneratePortraitProgress,
  GeneratePortraitStage,
  PORTRAIT_LLM_TASK,
  buildPortraitMidjourneyPrompt,
} from './constants/generate-portrait-wire'

export interface GeneratedSelectedMjImage {
  imageUrl: string
  jobId: string
  variantIndex: PortraitVariantIndex | null
}

export interface GenerateSelectedMjImageInput {
  prompt: string
  subject: string
  apiKey: string
  aspectRatio: string
  task: string
  variantInstruction: string
  projectId: string
}

function midjourneyRequestPayload(fullPrompt: string, aspectRatio: string): Record<string, unknown> {
  return {
    model: ApiframeImageModel.Midjourney,
    prompt: fullPrompt,
    midjourneyParams: { [ApiframeImageField.AspectRatio]: aspectRatio },
  }
}

function selectedGridUrl(result: ApiframeImageResult): string | null {
  if (result.gridUrl) return result.gridUrl
  if (result.images.length > 1) return result.images[0] ?? null
  return null
}

function logMidjourneyOutput(
  message: GeneratePortraitLog,
  result: ApiframeImageResult & { jobId?: string },
): void {
  logger.info(message, {
    jobId: result.jobId,
    images: result.images,
    gridUrl: result.gridUrl,
  })
}

async function upsampleSelectedVariant(
  imagineJobId: string,
  variantIndex: PortraitVariantIndex,
  apiKey: string,
  fullPrompt: string,
  requestPayload: Record<string, unknown>,
  task: string,
): Promise<string> {
  await metadata.set(GeneratePortraitMetadataKey.Stage, GeneratePortraitStage.Upsampling)
  await metadata.set(GeneratePortraitMetadataKey.Progress, GeneratePortraitProgress.Upsampling)
  const upsampleJobId = await submitMidjourneyUpsample(imagineJobId, variantIndex, apiKey)
  const upsampled = await pollApiframeJob(upsampleJobId, apiKey, 90, 3000)
  logMidjourneyOutput(GeneratePortraitLog.UpsampleRaw, { ...upsampled, jobId: upsampleJobId })
  const imageUrl = upsampled.images[0]
  if (!imageUrl) {
    logLLMRequestError({
      provider: ImageGenProvider.Midjourney,
      model: ApiframeImageModel.Midjourney,
      prompt: fullPrompt,
      error: GeneratePortraitError.NoImageUrl,
      input: requestPayload,
      output: upsampled,
    })
    throw new Error(GeneratePortraitError.NoImageUrl)
  }
  logLLMRequestComplete({
    provider: ImageGenProvider.Midjourney,
    model: ApiframeImageModel.Midjourney,
    prompt: fullPrompt,
    outputImageUrls: [imageUrl],
    output: { ...upsampled, jobId: upsampleJobId, variantIndex },
    metadata: { task, stage: GeneratePortraitStage.Upsampling },
  })
  return imageUrl
}

export async function generateSelectedMjImage(
  input: GenerateSelectedMjImageInput,
): Promise<GeneratedSelectedMjImage> {
  const { prompt: fullPrompt, subject, apiKey, aspectRatio, task, variantInstruction } = input
  logger.info(GeneratePortraitLog.MidjourneyPrompt, { prompt: fullPrompt })
  const requestPayload = midjourneyRequestPayload(fullPrompt, aspectRatio)
  logLLMRequestStart({
    provider: ImageGenProvider.Midjourney,
    model: ApiframeImageModel.Midjourney,
    prompt: fullPrompt,
    input: requestPayload,
    metadata: { task },
  })

  await metadata.set(GeneratePortraitMetadataKey.Stage, GeneratePortraitStage.Generating)
  await metadata.set(GeneratePortraitMetadataKey.Progress, GeneratePortraitProgress.Generating)

  let imagine: ApiframeImageResult & { jobId: string }
  try {
    imagine = await generateMidjourneyImages(fullPrompt, apiKey, {
      aspectRatio,
      maxAttempts: 90,
      intervalMs: 3000,
    })
  } catch (error: unknown) {
    logLLMRequestError({
      provider: ImageGenProvider.Midjourney,
      model: ApiframeImageModel.Midjourney,
      prompt: fullPrompt,
      error: getErrorMessage(error) || GeneratePortraitError.NoImageUrl,
      input: requestPayload,
    })
    throw error instanceof Error ? error : new Error(getErrorMessage(error))
  }

  await metadata.set(GeneratePortraitMetadataKey.DiffusionJobId, imagine.jobId)
  logMidjourneyOutput(GeneratePortraitLog.MidjourneyRaw, imagine)
  logLLMRequestComplete({
    provider: ImageGenProvider.Midjourney,
    model: ApiframeImageModel.Midjourney,
    prompt: fullPrompt,
    outputImageUrls: [...imagine.images, ...(imagine.gridUrl ? [imagine.gridUrl] : [])],
    output: imagine,
    metadata: { task, jobId: imagine.jobId },
  })

  const gridUrl = selectedGridUrl(imagine)
  if (!gridUrl) {
    const imageUrl = imagine.images[0]
    if (!imageUrl) {
      logger.error(GeneratePortraitLog.NoImage, { output: imagine })
      throw new Error(GeneratePortraitError.NoImageUrl)
    }
    return { imageUrl, jobId: imagine.jobId, variantIndex: null }
  }

  await metadata.set(GeneratePortraitMetadataKey.Stage, GeneratePortraitStage.Selecting)
  await metadata.set(GeneratePortraitMetadataKey.Progress, GeneratePortraitProgress.Selecting)
  const variantIndex = await pickPortraitVariantIndex({
    imageUrl: gridUrl,
    subject,
    instruction: variantInstruction,
    projectId: input.projectId,
  })
  await metadata.set(GeneratePortraitMetadataKey.VariantIndex, variantIndex)
  logger.info(GeneratePortraitLog.VariantPicked, { variantIndex, gridUrl })

  const imageUrl = await upsampleSelectedVariant(
    imagine.jobId,
    variantIndex,
    apiKey,
    fullPrompt,
    requestPayload,
    task,
  )
  return { imageUrl, jobId: imagine.jobId, variantIndex }
}

export async function generateSelectedPortraitImage(
  prompt: string,
  apiKey: string,
  projectId: string,
): Promise<GeneratedSelectedMjImage> {
  return generateSelectedMjImage({
    prompt: buildPortraitMidjourneyPrompt(prompt),
    subject: prompt,
    apiKey,
    aspectRatio: ApiframeGenerateAspectRatio.Square,
    task: PORTRAIT_LLM_TASK,
    variantInstruction: PortraitVariantCopy.Instruction,
    projectId,
  })
}
