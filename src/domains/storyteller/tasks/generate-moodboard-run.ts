import { logger, metadata } from '@trigger.dev/sdk/v3'
import fs from 'fs'
import path from 'path'
import { getErrorMessage } from '@/shared/errors/error-utils'
import {
  logLLMRequestStart,
  logLLMRequestComplete,
  logLLMRequestError,
} from '@/trigger/utils/llm-logger'
import {
  MOODBOARD_BASE64_LABEL,
  MOODBOARD_COMMA_JOIN,
  MOODBOARD_CONTENT_TYPE_JSON,
  MOODBOARD_DEFAULT_GEMINI_MODEL,
  MOODBOARD_ENCODING_BASE64,
  MOODBOARD_GEMINI_NO_IMAGE,
  MOODBOARD_HTTP_GET,
  MOODBOARD_HTTP_POST,
  MOODBOARD_IMAGE_GEN_FAILED,
  MOODBOARD_INLINE_DATA_KEY,
  MOODBOARD_LEGNEXT_NO_IMAGE,
  MOODBOARD_LEGNEXT_NO_JOB,
  MOODBOARD_LEGNEXT_NOT_FOUND,
  MOODBOARD_LEGNEXT_STATUS_COMPLETED,
  MOODBOARD_LEGNEXT_STATUS_FAILED,
  MOODBOARD_LEGNEXT_STATUS_PENDING,
  MOODBOARD_LEGNEXT_STATUS_PROCESSING,
  MOODBOARD_LEGNEXT_TIMEOUT,
  MOODBOARD_LLM_MODEL_DIFFUSION,
  MOODBOARD_LLM_PROVIDER_GEMINI,
  MOODBOARD_LLM_PROVIDER_MIDJOURNEY,
  MOODBOARD_LLM_TASK,
  MOODBOARD_METADATA_DIFFUSION_JOB_ID,
  MOODBOARD_METADATA_PROGRESS,
  MOODBOARD_METADATA_STAGE,
  MOODBOARD_NOT_FOUND_FRAGMENT,
  MOODBOARD_POLL_CONTINUE,
  MOODBOARD_PROJECTS_DIR,
  MOODBOARD_PROMPT_SUFFIX,
  MOODBOARD_PROVIDER_MIDJOURNEY,
  MOODBOARD_PROVIDER_NANOBANANA,
  MOODBOARD_PUBLIC_DIR,
  MOODBOARD_RESPONSE_MODALITY_IMAGE,
  MOODBOARD_RESPONSE_MODALITY_TEXT,
  MOODBOARD_STAGE_DOWNLOADING,
  MOODBOARD_STAGE_SAVING,
  MOODBOARD_STAGE_SUBMITTING,
  MOODBOARD_STAGE_WAITING,
  MOODBOARD_UNKNOWN_ERROR,
} from './constants/moodboard-task-wire'

export interface GenerateMoodboardPayload {
  projectId: string
  prompts: string[]
  styleReference?: string
  replaceIndex?: number
  providerConfig: {
    provider: 'nanobanana' | 'midjourney'
    apiKey: string
    modelId?: string
    styleReferenceUrls?: string[]
  }
}

interface LegNextPollResult {
  status?: string
  message?: string
  output?: {
    image_url?: string
    image_urls?: string[]
    error_messages?: string[]
    [key: string]: unknown
  }
  [key: string]: unknown
}

function collectStyleReferences(
  styleReference?: string,
  styleReferenceUrls?: string[],
): string[] {
  return [...(styleReference ? [styleReference] : []), ...(styleReferenceUrls || [])].filter(Boolean)
}

function estimateLegNextProgress(status: string | undefined, attempts: number): number {
  if (status === MOODBOARD_LEGNEXT_STATUS_COMPLETED) return 100
  if (status === MOODBOARD_LEGNEXT_STATUS_PROCESSING) return 50 + (attempts % 40)
  if (status === MOODBOARD_LEGNEXT_STATUS_PENDING) return 10
  return 0
}

async function fetchLegNextJob(jobId: string, apiKey: string): Promise<LegNextPollResult | null> {
  const fetchResponse = await fetch(`https://api.legnext.ai/api/v1/job/${jobId}`, {
    method: MOODBOARD_HTTP_GET,
    headers: { 'x-api-key': apiKey },
  })
  if (fetchResponse.status === 404) throw new Error(MOODBOARD_LEGNEXT_NOT_FOUND)
  if (!fetchResponse.ok) {
    logger.warn(`LegNext polling error: ${fetchResponse.status} - ${await fetchResponse.text()}`)
    return null
  }
  return fetchResponse.json()
}

async function handleLegNextPollResult(
  data: LegNextPollResult,
): Promise<LegNextPollResult | typeof MOODBOARD_POLL_CONTINUE> {
  if (data.status === MOODBOARD_LEGNEXT_STATUS_COMPLETED) return data
  if (data.status === MOODBOARD_LEGNEXT_STATUS_FAILED) {
    const errorMsg =
      data.output?.error_messages?.join(MOODBOARD_COMMA_JOIN) ||
      data.message ||
      MOODBOARD_UNKNOWN_ERROR
    throw new Error(errorMsg)
  }
  return MOODBOARD_POLL_CONTINUE
}

async function pollLegNextTask(
  jobId: string,
  apiKey: string,
  maxAttempts: number = 300,
  progressOffset: number = 30,
): Promise<LegNextPollResult> {
  let attempts = 0
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000))
    try {
      const data = await fetchLegNextJob(jobId, apiKey)
      if (!data) {
        attempts++
        continue
      }
      const scaledProgress =
        progressOffset + Math.round(estimateLegNextProgress(data.status, attempts) * 0.65)
      await metadata.set(MOODBOARD_METADATA_PROGRESS, scaledProgress)
      const outcome = await handleLegNextPollResult(data)
      if (outcome !== MOODBOARD_POLL_CONTINUE) {
        await metadata.set(MOODBOARD_METADATA_PROGRESS, progressOffset + 65)
        return outcome
      }
    } catch (e: unknown) {
      if (getErrorMessage(e)?.includes(MOODBOARD_NOT_FOUND_FRAGMENT)) throw e
    }
    attempts++
  }
  throw new Error(MOODBOARD_LEGNEXT_TIMEOUT)
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
  return Buffer.from(await imgRes.arrayBuffer()).toString(MOODBOARD_ENCODING_BASE64)
}

async function generateMidjourneyImage(
  prompt: string,
  apiKey: string,
  allStyleRefs: string[],
  promptIndex: number,
): Promise<string | null> {
  const fullPrompt = buildMidjourneyPrompt(`${prompt}${MOODBOARD_PROMPT_SUFFIX}`, allStyleRefs)
  const diffusionPayload = { text: fullPrompt }
  logLLMRequestStart({
    provider: MOODBOARD_LLM_PROVIDER_MIDJOURNEY,
    model: MOODBOARD_LLM_MODEL_DIFFUSION,
    prompt: fullPrompt,
    inputImageUrls: allStyleRefs.length > 0 ? allStyleRefs : undefined,
    input: diffusionPayload,
    metadata: { task: MOODBOARD_LLM_TASK, promptIndex },
  })
  await metadata.set(MOODBOARD_METADATA_STAGE, MOODBOARD_STAGE_SUBMITTING)
  const diffusionResponse = await fetch('https://api.legnext.ai/api/v1/diffusion', {
    method: MOODBOARD_HTTP_POST,
    headers: { 'x-api-key': apiKey, 'Content-Type': MOODBOARD_CONTENT_TYPE_JSON },
    body: JSON.stringify(diffusionPayload),
  })
  if (!diffusionResponse.ok) {
    logLLMRequestError({
      provider: MOODBOARD_LLM_PROVIDER_MIDJOURNEY,
      model: MOODBOARD_LLM_MODEL_DIFFUSION,
      prompt: fullPrompt,
      error: `HTTP ${diffusionResponse.status}: ${await diffusionResponse.text()}`,
      input: diffusionPayload,
    })
    return null
  }
  const diffusionData = await diffusionResponse.json()
  const jobId = diffusionData.job_id
  if (!jobId) {
    logLLMRequestError({
      provider: MOODBOARD_LLM_PROVIDER_MIDJOURNEY,
      model: MOODBOARD_LLM_MODEL_DIFFUSION,
      prompt: fullPrompt,
      error: MOODBOARD_LEGNEXT_NO_JOB,
      input: diffusionPayload,
      output: diffusionData,
    })
    return null
  }
  await metadata.set(MOODBOARD_METADATA_DIFFUSION_JOB_ID, jobId)
  await metadata.set(MOODBOARD_METADATA_STAGE, MOODBOARD_STAGE_WAITING)
  const result = await pollLegNextTask(jobId, apiKey)
  const imageUrl = result.output?.image_urls?.[0] || result.output?.image_url
  if (!imageUrl) {
    logLLMRequestError({
      provider: MOODBOARD_LLM_PROVIDER_MIDJOURNEY,
      model: MOODBOARD_LLM_MODEL_DIFFUSION,
      prompt: fullPrompt,
      error: MOODBOARD_LEGNEXT_NO_IMAGE,
      input: diffusionPayload,
      output: result,
    })
    return null
  }
  logLLMRequestComplete({
    provider: MOODBOARD_LLM_PROVIDER_MIDJOURNEY,
    model: MOODBOARD_LLM_MODEL_DIFFUSION,
    prompt: fullPrompt,
    outputImageUrls: [imageUrl],
    output: result.output,
  })
  return downloadImageAsBase64(imageUrl)
}

function extractGeminiImageBase64(data: {
  candidates?: Array<{ content?: { parts?: Array<Record<string, unknown>> } }>
}): string | null {
  for (const part of data.candidates?.[0]?.content?.parts ?? []) {
    const inlineData = part.inline_data ?? part.inlineData
    if (
      inlineData &&
      typeof inlineData === 'object' &&
      MOODBOARD_INLINE_DATA_KEY in inlineData &&
      typeof inlineData[MOODBOARD_INLINE_DATA_KEY] === 'string'
    ) {
      return inlineData[MOODBOARD_INLINE_DATA_KEY]
    }
  }
  return null
}

async function generateNanoBananaImage(
  prompt: string,
  apiKey: string,
  modelId: string | undefined,
  allStyleRefs: string[],
  promptIndex: number,
): Promise<string | null> {
  const targetModel = modelId || MOODBOARD_DEFAULT_GEMINI_MODEL
  const enhancedPrompt = `${prompt}${MOODBOARD_PROMPT_SUFFIX}`
  const payload = {
    contents: [{ parts: [{ text: enhancedPrompt }] }],
    generationConfig: {
      responseModalities: [MOODBOARD_RESPONSE_MODALITY_TEXT, MOODBOARD_RESPONSE_MODALITY_IMAGE],
    },
  }
  logLLMRequestStart({
    provider: MOODBOARD_LLM_PROVIDER_GEMINI,
    model: targetModel,
    prompt: enhancedPrompt,
    inputImageUrls: allStyleRefs.length > 0 ? allStyleRefs : undefined,
    input: payload,
    metadata: { task: MOODBOARD_LLM_TASK, promptIndex, provider: MOODBOARD_PROVIDER_NANOBANANA },
  })
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`,
    {
      method: MOODBOARD_HTTP_POST,
      headers: { 'Content-Type': MOODBOARD_CONTENT_TYPE_JSON },
      body: JSON.stringify(payload),
    },
  )
  if (!response.ok) {
    logLLMRequestError({
      provider: MOODBOARD_LLM_PROVIDER_GEMINI,
      model: targetModel,
      prompt: enhancedPrompt,
      error: `HTTP ${response.status}: ${await response.text()}`,
      input: payload,
    })
    return null
  }
  const data = await response.json()
  const imageBase64 = extractGeminiImageBase64(data)
  if (!imageBase64) {
    logLLMRequestError({
      provider: MOODBOARD_LLM_PROVIDER_GEMINI,
      model: targetModel,
      prompt: enhancedPrompt,
      error: MOODBOARD_GEMINI_NO_IMAGE,
      input: payload,
      output: data,
    })
    return null
  }
  logLLMRequestComplete({
    provider: MOODBOARD_LLM_PROVIDER_GEMINI,
    model: targetModel,
    prompt: enhancedPrompt,
    outputImageUrls: [MOODBOARD_BASE64_LABEL],
    output: { finishReason: data.candidates?.[0]?.finishReason, hasImage: true },
  })
  return imageBase64
}

async function generateMoodboardImage(
  provider: GenerateMoodboardPayload['providerConfig']['provider'],
  prompt: string,
  apiKey: string,
  modelId: string | undefined,
  allStyleRefs: string[],
  promptIndex: number,
): Promise<string | null> {
  if (provider === MOODBOARD_PROVIDER_MIDJOURNEY) {
    return generateMidjourneyImage(prompt, apiKey, allStyleRefs, promptIndex)
  }
  if (provider === MOODBOARD_PROVIDER_NANOBANANA) {
    return generateNanoBananaImage(prompt, apiKey, modelId, allStyleRefs, promptIndex)
  }
  return null
}

function saveMoodboardImage(projectId: string, imageBase64: string): string {
  const filename = `mood_${Date.now()}_${Math.random().toString(36).substring(7)}.png`
  const projectDir = path.join(process.cwd(), MOODBOARD_PUBLIC_DIR, MOODBOARD_PROJECTS_DIR, projectId)
  if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true })
  fs.writeFileSync(
    path.join(projectDir, filename),
    Buffer.from(imageBase64, MOODBOARD_ENCODING_BASE64),
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
