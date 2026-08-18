import { logger, metadata } from '@trigger.dev/sdk/v3'
import fs from 'fs'
import path from 'path'
import { getErrorMessage } from '@/shared/errors/error-utils'
import {
  logLLMRequestStart,
  logLLMRequestComplete,
  logLLMRequestError,
} from '@/trigger/utils/llm-logger'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import { ApiframeImageModel } from '@/shared/ai/constants/apiframe'
import {
  generateMidjourneyImages,
  pickApiframeImageUrl,
} from '@/shared/ai/apiframe'
import { generateNanoBananaBase64 } from '@/shared/ai/apiframe-nano-banana'
import {
  BufferEncoding,
  FsDirectory,
} from '@/shared/data/constants/protocol'
import {
  MOODBOARD_BASE64_LABEL,
  MOODBOARD_GEMINI_NO_IMAGE,
  MOODBOARD_IMAGE_GEN_FAILED,
  MOODBOARD_APIFRAME_NO_IMAGE,
  MOODBOARD_APIFRAME_NO_JOB,
  MOODBOARD_LLM_TASK,
  MOODBOARD_METADATA_DIFFUSION_JOB_ID,
  MOODBOARD_METADATA_PROGRESS,
  MOODBOARD_METADATA_STAGE,
  MOODBOARD_PROMPT_SUFFIX,
  MOODBOARD_STAGE_DOWNLOADING,
  MOODBOARD_STAGE_SAVING,
  MOODBOARD_STAGE_SUBMITTING,
  MOODBOARD_STAGE_WAITING,
} from './constants/moodboard-task-wire'

export interface GenerateMoodboardPayload {
  projectId: string
  prompts: string[]
  styleReference?: string
  replaceIndex?: number
  providerConfig: {
    provider: ImageGenProvider
    apiKey: string
    modelId?: string
    styleReferenceUrls?: string[]
  }
}

function collectStyleReferences(
  styleReference?: string,
  styleReferenceUrls?: string[],
): string[] {
  return [...(styleReference ? [styleReference] : []), ...(styleReferenceUrls || [])].filter(Boolean)
}

function buildMidjourneyPrompt(enhancedPrompt: string, allStyleRefs: string[]): string {
  const imagePromptPart = allStyleRefs.length > 0 ? `${allStyleRefs[0]} ` : ''
  let fullPrompt = `${imagePromptPart}${enhancedPrompt} --v 7 --ar 16:9`
  if (allStyleRefs.length > 0) fullPrompt += ` --sref ${allStyleRefs.join(' ')}`
  return fullPrompt
}

async function downloadImageAsBase64(imageUrl: string): Promise<string | null> {
  await metadata.set(MOODBOARD_METADATA_STAGE, MOODBOARD_STAGE_DOWNLOADING)
  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) return null
  return Buffer.from(await imgRes.arrayBuffer()).toString(BufferEncoding.Base64)
}

async function generateMidjourneyImage(
  prompt: string,
  apiKey: string,
  allStyleRefs: string[],
  promptIndex: number,
): Promise<string | null> {
  const fullPrompt = buildMidjourneyPrompt(`${prompt}${MOODBOARD_PROMPT_SUFFIX}`, allStyleRefs)
  const requestPayload = {
    model: ApiframeImageModel.Midjourney,
    prompt: fullPrompt,
    midjourneyParams: { aspect_ratio: '16:9' },
  }
  logLLMRequestStart({
    provider: ImageGenProvider.Midjourney,
    model: ApiframeImageModel.Midjourney,
    prompt: fullPrompt,
    inputImageUrls: allStyleRefs.length > 0 ? allStyleRefs : undefined,
    input: requestPayload,
    metadata: { task: MOODBOARD_LLM_TASK, promptIndex },
  })
  await metadata.set(MOODBOARD_METADATA_STAGE, MOODBOARD_STAGE_SUBMITTING)
  try {
    await metadata.set(MOODBOARD_METADATA_STAGE, MOODBOARD_STAGE_WAITING)
    const result = await generateMidjourneyImages(fullPrompt, apiKey, {
      aspectRatio: '16:9',
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
      return null
    }
    logLLMRequestComplete({
      provider: ImageGenProvider.Midjourney,
      model: ApiframeImageModel.Midjourney,
      prompt: fullPrompt,
      outputImageUrls: [imageUrl],
      output: result,
    })
    return downloadImageAsBase64(imageUrl)
  } catch (error: unknown) {
    logLLMRequestError({
      provider: ImageGenProvider.Midjourney,
      model: ApiframeImageModel.Midjourney,
      prompt: fullPrompt,
      error: getErrorMessage(error) || MOODBOARD_APIFRAME_NO_JOB,
      input: requestPayload,
    })
    return null
  }
}

async function generateNanoBananaImage(
  prompt: string,
  apiKey: string,
  modelId: string | undefined,
  allStyleRefs: string[],
  promptIndex: number,
): Promise<string | null> {
  const enhancedPrompt = `${prompt}${MOODBOARD_PROMPT_SUFFIX}`
  const model = modelId || ApiframeImageModel.NanoBanana
  logLLMRequestStart({
    provider: ImageGenProvider.NanoBanana,
    model,
    prompt: enhancedPrompt,
    inputImageUrls: allStyleRefs.length > 0 ? allStyleRefs : undefined,
    metadata: { task: MOODBOARD_LLM_TASK, promptIndex, provider: ImageGenProvider.NanoBanana },
  })
  try {
    const imageBase64 = await generateNanoBananaBase64({
      prompt: enhancedPrompt,
      apiKey,
      modelId,
      imageInputUrls: allStyleRefs.length > 0 ? allStyleRefs : undefined,
      aspectRatio: '16:9',
    })
    logLLMRequestComplete({
      provider: ImageGenProvider.NanoBanana,
      model,
      prompt: enhancedPrompt,
      outputImageUrls: [MOODBOARD_BASE64_LABEL],
      output: { hasImage: true },
    })
    return imageBase64
  } catch (error: unknown) {
    logLLMRequestError({
      provider: ImageGenProvider.NanoBanana,
      model,
      prompt: enhancedPrompt,
      error: getErrorMessage(error) || MOODBOARD_GEMINI_NO_IMAGE,
    })
    return null
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
  allStyleRefs: string[],
  promptIndex: number,
): Promise<string | null> {
  if (isMidjourneyMoodboard(provider, modelId)) {
    return generateMidjourneyImage(prompt, apiKey, allStyleRefs, promptIndex)
  }
  return generateNanoBananaImage(prompt, apiKey, modelId, allStyleRefs, promptIndex)
}

function saveMoodboardImage(projectId: string, imageBase64: string): string {
  const filename = `mood_${Date.now()}_${Math.random().toString(36).substring(7)}.png`
  const projectDir = path.join(
    process.cwd(),
    FsDirectory.Public,
    FsDirectory.Projects,
    projectId,
  )
  if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true })
  fs.writeFileSync(
    path.join(projectDir, filename),
    Buffer.from(imageBase64, BufferEncoding.Base64),
  )
  return filename
}

export async function generateAllMoodboardImages(
  payload: GenerateMoodboardPayload,
  allStyleRefs: string[],
): Promise<string[]> {
  const { projectId, prompts, providerConfig } = payload
  const generatedFilenames: string[] = []
  for (let i = 0; i < prompts.length; i++) {
    await metadata.set(MOODBOARD_METADATA_STAGE, `generating_image_${i + 1}_of_${prompts.length}`)
    await metadata.set(MOODBOARD_METADATA_PROGRESS, Math.round((i / prompts.length) * 70))
    try {
      const imageBase64 = await generateMoodboardImage(
        providerConfig.provider,
        prompts[i],
        providerConfig.apiKey,
        providerConfig.modelId,
        allStyleRefs,
        i,
      )
      if (imageBase64) {
        await metadata.set(MOODBOARD_METADATA_STAGE, MOODBOARD_STAGE_SAVING)
        generatedFilenames.push(saveMoodboardImage(projectId, imageBase64))
      }
    } catch (error) {
      logger.error(MOODBOARD_IMAGE_GEN_FAILED, { prompt: prompts[i], error })
    }
  }
  return generatedFilenames
}

export function collectMoodboardStyleReferences(payload: GenerateMoodboardPayload): string[] {
  return collectStyleReferences(payload.styleReference, payload.providerConfig.styleReferenceUrls)
}
