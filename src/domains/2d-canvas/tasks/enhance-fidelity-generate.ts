import { v4 as uuidv4 } from 'uuid'
import { generateApiframeImage, pickApiframeImageUrl } from '@/shared/ai/apiframe'
import {
  ApiframeErrorMessage,
  ApiframeGenerateAspectRatio,
  type ApiframeImageModel,
} from '@/shared/ai/constants/apiframe'
import { imageGenerateModelToImageGenProvider } from '@/shared/ai/image-model-env'
import { API_ERROR, TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { REPAINT_STYLE_REF_PREFIX } from '@/shared/data/constants/repaint-gemini'
import {
  BufferEncoding,
  ContentType,
  StringSeparator,
  UrlScheme,
} from '@/shared/data/constants/protocol'
import { FIDELITY_PROMPTS, getCreativityPrompt } from '@/shared/data/server/prompts'
import { storageService } from '@/shared/data/storage/storage-service'
import {
  logLLMRequestComplete,
  logLLMRequestError,
  logLLMRequestStart,
} from '@/trigger/utils/llm-logger'

enum FidelityGenerateAsset {
  TilePrefix = 'fidelity_tile',
}

export interface EnhanceFidelityGenerateInput {
  apiKey: string
  model: ApiframeImageModel
  imageBase64: string
  stylePrompt: string
  creativity: number
  styleReferenceUrls?: string[]
}

function toPngDataUrl(base64: string): string {
  if (base64.startsWith(UrlScheme.Data)) return base64
  return `${UrlScheme.Data}${ContentType.Png};${BufferEncoding.Base64},${base64}`
}

function styleRefHint(urls: string[] | undefined): string {
  if (!urls || urls.length === 0) return ''
  return `${REPAINT_STYLE_REF_PREFIX}${urls.join(StringSeparator.CommaSpace)}.`
}

async function uploadFidelityTile(imageBase64: string): Promise<string> {
  const filename = `${FidelityGenerateAsset.TilePrefix}_${uuidv4()}.png`
  const url = await storageService.uploadPublicImage(filename, toPngDataUrl(imageBase64))
  if (!url) throw new Error(API_ERROR.UPLOAD_FAILED)
  return url
}

export async function enhanceFidelityWithGenerate(
  input: EnhanceFidelityGenerateInput,
): Promise<string> {
  const { apiKey, model, imageBase64, stylePrompt, creativity, styleReferenceUrls } = input
  const provider = imageGenerateModelToImageGenProvider(model)
  const tileUrl = await uploadFidelityTile(imageBase64)
  const imageInputUrls = [tileUrl, ...(styleReferenceUrls ?? [])]
  const prompt = FIDELITY_PROMPTS.GEMINI(
    stylePrompt,
    getCreativityPrompt(creativity),
    styleRefHint(styleReferenceUrls),
  )

  logLLMRequestStart({
    provider,
    model,
    prompt,
    inputImageUrls: imageInputUrls,
    metadata: { task: TRIGGER_TASK_ID.ENHANCE_FIDELITY },
  })

  try {
    const result = await generateApiframeImage({
      model,
      prompt,
      apiKey,
      aspectRatio: ApiframeGenerateAspectRatio.Square,
      imageInputUrls,
    })
    const imageUrl = pickApiframeImageUrl(result)
    if (!imageUrl) throw new Error(ApiframeErrorMessage.NoImages)
    logLLMRequestComplete({
      provider,
      model,
      prompt,
      outputImageUrls: [imageUrl],
    })
    return imageUrl
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logLLMRequestError({ provider, model, prompt, error: message })
    throw error
  }
}
