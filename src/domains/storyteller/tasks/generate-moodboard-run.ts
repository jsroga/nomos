import { logger, metadata } from '@trigger.dev/sdk/v3'
import { getErrorMessage } from '@/shared/errors/error-utils'
import {
  logLLMRequestStart,
  logLLMRequestComplete,
  logLLMRequestError,
} from '@/trigger/utils/llm-logger'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import {
  generateMidjourneyImages,
  pickApiframeImageUrl,
} from '@/shared/ai/apiframe'
import {
  ApiframeGenerateAspectRatio,
  ApiframeImageField,
  ApiframeImageModel,
  MIDJOURNEY_VERSION,
} from '@/shared/ai/constants/apiframe'
import { generateNanoBananaBase64 } from '@/shared/ai/apiframe-nano-banana'
import { BufferEncoding } from '@/shared/data/constants/protocol'
import { MidjourneyParamFlag } from '@/shared/data/server/midjourney-params'
import { appendStorytellerLookSref } from './constants/storyteller-look-sref'
import { persistGeneratedImage, resolveDurablePublicImageUrl } from './persist-generated-image'
import {
  MOODBOARD_BASE64_LABEL,
  MOODBOARD_GEMINI_NO_IMAGE,
  MOODBOARD_IMAGE_GEN_FAILED,
  MOODBOARD_APIFRAME_NO_IMAGE,
  MOODBOARD_APIFRAME_NO_JOB,
  MOODBOARD_DOWNLOAD_FAILED,
  MOODBOARD_LLM_TASK,
  MOODBOARD_METADATA_DIFFUSION_JOB_ID,
  MOODBOARD_METADATA_PROGRESS,
  MOODBOARD_METADATA_STAGE,
  wrapMoodboardScene,
  isMoodboardStyleRefUrl,
  moodboardStyleReferenceForPrompt,
  MOODBOARD_STAGE_DOWNLOADING,
  MOODBOARD_STAGE_SAVING,
  MOODBOARD_STAGE_SUBMITTING,
  MOODBOARD_STAGE_WAITING,
} from './constants/moodboard-task-wire'

export interface GenerateMoodboardPayload {
  projectId: string
  prompts?: string[]
  promptIndex?: number
  worldDesc?: string
  overview?: string
  replaceIndex?: number
  styleReferenceUrl?: string
  providerConfig: {
    provider: ImageGenProvider
    apiKey: string
    modelId?: string
  }
}

interface MoodboardGeneratedImage {
  base64: string
  publicUrl?: string
}

export function buildMoodboardMidjourneyPrompt(scene: string, styleReferenceUrl?: string): string {
  const base = `${wrapMoodboardScene(scene)} ${MidjourneyParamFlag.Version} ${MIDJOURNEY_VERSION} ${MidjourneyParamFlag.AspectRatio} ${ApiframeGenerateAspectRatio.Widescreen}`
  return appendStorytellerLookSref(base, styleReferenceUrl ? [styleReferenceUrl] : [])
}

async function downloadImageAsBase64(imageUrl: string): Promise<string> {
  await metadata.set(MOODBOARD_METADATA_STAGE, MOODBOARD_STAGE_DOWNLOADING)
  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) {
    throw new Error(`${MOODBOARD_DOWNLOAD_FAILED}: ${imgRes.status}`)
  }
  return Buffer.from(await imgRes.arrayBuffer()).toString(BufferEncoding.Base64)
}

async function generateMidjourneyImage(
  prompt: string,
  apiKey: string,
  promptIndex: number,
  styleReferenceUrl?: string,
): Promise<MoodboardGeneratedImage> {
  const fullPrompt = buildMoodboardMidjourneyPrompt(prompt, styleReferenceUrl)
  const requestPayload = {
    model: ApiframeImageModel.Midjourney,
    prompt: fullPrompt,
    midjourneyParams: { [ApiframeImageField.AspectRatio]: ApiframeGenerateAspectRatio.Widescreen },
  }
  logLLMRequestStart({
    provider: ImageGenProvider.Midjourney,
    model: ApiframeImageModel.Midjourney,
    prompt: fullPrompt,
    input: requestPayload,
    metadata: { task: MOODBOARD_LLM_TASK, promptIndex },
  })
  await metadata.set(MOODBOARD_METADATA_STAGE, MOODBOARD_STAGE_SUBMITTING)
  try {
    await metadata.set(MOODBOARD_METADATA_STAGE, MOODBOARD_STAGE_WAITING)
    const result = await generateMidjourneyImages(fullPrompt, apiKey, {
      aspectRatio: ApiframeGenerateAspectRatio.Widescreen,
      maxAttempts: 90,
      intervalMs: 3000,
    })
    await metadata.set(MOODBOARD_METADATA_DIFFUSION_JOB_ID, result.jobId)
    await metadata.set(MOODBOARD_METADATA_PROGRESS, 90)
    const imageUrl = pickApiframeImageUrl(result)
    if (!imageUrl) {
      logLLMRequestError({
        provider: ImageGenProvider.Midjourney,
        model: ApiframeImageModel.Midjourney,
        prompt: fullPrompt,
        error: MOODBOARD_APIFRAME_NO_IMAGE,
        input: requestPayload,
        output: result,
      })
      throw new Error(MOODBOARD_APIFRAME_NO_IMAGE)
    }
    logLLMRequestComplete({
      provider: ImageGenProvider.Midjourney,
      model: ApiframeImageModel.Midjourney,
      prompt: fullPrompt,
      outputImageUrls: [imageUrl],
      output: result,
    })
    return {
      base64: await downloadImageAsBase64(imageUrl),
      publicUrl: imageUrl,
    }
  } catch (error: unknown) {
    logLLMRequestError({
      provider: ImageGenProvider.Midjourney,
      model: ApiframeImageModel.Midjourney,
      prompt: fullPrompt,
      error: getErrorMessage(error) || MOODBOARD_APIFRAME_NO_JOB,
      input: requestPayload,
    })
    throw error instanceof Error
      ? error
      : new Error(getErrorMessage(error) || MOODBOARD_APIFRAME_NO_JOB)
  }
}

async function generateNanoBananaImage(
  prompt: string,
  apiKey: string,
  modelId: string | undefined,
  promptIndex: number,
): Promise<MoodboardGeneratedImage> {
  const enhancedPrompt = wrapMoodboardScene(prompt)
  const model = modelId || ApiframeImageModel.NanoBanana
  logLLMRequestStart({
    provider: ImageGenProvider.NanoBanana,
    model,
    prompt: enhancedPrompt,
    metadata: { task: MOODBOARD_LLM_TASK, promptIndex, provider: ImageGenProvider.NanoBanana },
  })
  try {
    const imageBase64 = await generateNanoBananaBase64({
      prompt: enhancedPrompt,
      apiKey,
      modelId,
      aspectRatio: ApiframeGenerateAspectRatio.Widescreen,
    })
    logLLMRequestComplete({
      provider: ImageGenProvider.NanoBanana,
      model,
      prompt: enhancedPrompt,
      outputImageUrls: [MOODBOARD_BASE64_LABEL],
      output: { hasImage: true },
    })
    return { base64: imageBase64 }
  } catch (error: unknown) {
    logLLMRequestError({
      provider: ImageGenProvider.NanoBanana,
      model,
      prompt: enhancedPrompt,
      error: getErrorMessage(error) || MOODBOARD_GEMINI_NO_IMAGE,
    })
    throw error instanceof Error
      ? error
      : new Error(getErrorMessage(error) || MOODBOARD_GEMINI_NO_IMAGE)
  }
}

function isMidjourneyMoodboard(
  provider: ImageGenProvider,
  modelId: string | undefined,
): boolean {
  return (
    provider === ImageGenProvider.Midjourney || modelId === ApiframeImageModel.Midjourney
  )
}

async function generateMoodboardImage(
  provider: ImageGenProvider,
  prompt: string,
  apiKey: string,
  modelId: string | undefined,
  promptIndex: number,
  styleReferenceUrl?: string,
): Promise<MoodboardGeneratedImage> {
  if (isMidjourneyMoodboard(provider, modelId)) {
    return generateMidjourneyImage(prompt, apiKey, promptIndex, styleReferenceUrl)
  }
  return generateNanoBananaImage(prompt, apiKey, modelId, promptIndex)
}

async function saveMoodboardImage(
  projectId: string,
  image: MoodboardGeneratedImage,
): Promise<string> {
  const filename = `mood_${Date.now()}_${Math.random().toString(36).substring(7)}.png`
  const persistedUrl = await persistGeneratedImage({
    projectId,
    filename,
    bytes: Buffer.from(image.base64, BufferEncoding.Base64),
  })
  return resolveDurablePublicImageUrl(persistedUrl, image.publicUrl ?? persistedUrl)
}

export async function generateAllMoodboardImages(
  payload: GenerateMoodboardPayload & { prompts: string[] },
): Promise<string[]> {
  const { projectId, prompts, providerConfig, replaceIndex } = payload
  const generatedFilenames: string[] = []
  let keyImageUrl = payload.styleReferenceUrl
  let lastError: unknown
  for (let i = 0; i < prompts.length; i++) {
    await metadata.set(MOODBOARD_METADATA_STAGE, `generating_image_${i + 1}_of_${prompts.length}`)
    await metadata.set(
      MOODBOARD_METADATA_PROGRESS,
      Math.round(((i + 1) / (prompts.length + 1)) * 80),
    )
    try {
      const styleReferenceUrl = moodboardStyleReferenceForPrompt({
        replaceIndex,
        promptOffset: i,
        keyImageUrl,
      })
      const generated = await generateMoodboardImage(
        providerConfig.provider,
        prompts[i],
        providerConfig.apiKey,
        providerConfig.modelId,
        i,
        styleReferenceUrl,
      )
      await metadata.set(MOODBOARD_METADATA_STAGE, MOODBOARD_STAGE_SAVING)
      generatedFilenames.push(await saveMoodboardImage(projectId, generated))
      if (
        replaceIndex === undefined &&
        i === 0 &&
        generated.publicUrl &&
        isMoodboardStyleRefUrl(generated.publicUrl)
      ) {
        keyImageUrl = generated.publicUrl
      }
    } catch (error) {
      lastError = error
      logger.error(MOODBOARD_IMAGE_GEN_FAILED, {
        prompt: prompts[i],
        error: getErrorMessage(error),
      })
    }
  }
  if (generatedFilenames.length === 0) {
    if (lastError instanceof Error) throw lastError
    throw new Error(getErrorMessage(lastError) || MOODBOARD_IMAGE_GEN_FAILED)
  }
  return generatedFilenames
}
