import { logger, metadata } from '@trigger.dev/sdk'
import { UPSCALE_PROMPTS, getCreativityPrompt } from '@/shared/data/server/prompts'
import { buildUrl } from '@/shared/data/url-builder'
import {
  readRowString,
  recordArrayFromJson,
  recordFromJson,
} from '@/shared/data/json-guards'
import {
  UpscaleGeminiApiBaseUrl,
  UpscaleGeminiBase64DataUrlPattern,
  UpscaleGeminiCandidatesField,
  UpscaleGeminiContentField,
  UpscaleGeminiDefaultMimeType,
  UpscaleGeminiDefaultModel,
  UpscaleGeminiErrorMessage,
  UpscaleGeminiGenerateContentAction,
  UpscaleGeminiHttpContentType,
  UpscaleGeminiHttpMethod,
  UpscaleGeminiInlineFieldData,
  UpscaleGeminiInlineFieldMimeType,
  UpscaleGeminiInlineFieldMimeTypeAlt,
  UpscaleGeminiLogMessage,
  UpscaleGeminiPartsField,
  UpscaleGeminiProgressAfterStep,
  UpscaleGeminiResponseModalityImage,
  UpscaleGeminiResponseModalityText,
  UpscaleGeminiStage,
  UpscaleGeminiStyleRefJoin,
  UpscaleGeminiStyleRefPrefix,
  UpscaleGeminiStyleRefSuffix,
  UpscaleTaskMetadataKey,
} from './constants/upscale-gemini-wire'
import { findGeminiInlineImageData } from './upscale-tile-gemini-utils'

interface GeminiPreUpscaleConfig {
  apiKey: string
  model?: string
}

export async function runGeminiPreUpscaleStep(params: {
  imageBase64: string
  prompt: string
  creativity: number
  geminiConfig: GeminiPreUpscaleConfig
  styleReferenceUrls?: string[]
}): Promise<{ step1Image: string; step1MimeType: string }> {
  const { imageBase64, prompt, creativity, geminiConfig, styleReferenceUrls } = params

  logger.info(UpscaleGeminiLogMessage.Step1Start)
  await metadata.set(UpscaleTaskMetadataKey.Stage, UpscaleGeminiStage.GeminiUpscale)

  const model = geminiConfig.model || UpscaleGeminiDefaultModel
  const url = buildUrl(`${UpscaleGeminiApiBaseUrl}/${model}:${UpscaleGeminiGenerateContentAction}`, { key: geminiConfig.apiKey })

  const styleRefHint = styleReferenceUrls?.length
    ? `${UpscaleGeminiStyleRefPrefix}${styleReferenceUrls.join(UpscaleGeminiStyleRefJoin)}${UpscaleGeminiStyleRefSuffix}`
    : ''
  const creativityPrompt = getCreativityPrompt(creativity)
  const finalPrompt = UPSCALE_PROMPTS.GEMINI_STEP1(prompt, creativityPrompt, styleRefHint)

  const response = await fetch(url, {
    method: UpscaleGeminiHttpMethod,
    headers: { 'Content-Type': UpscaleGeminiHttpContentType },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: finalPrompt },
            {
              inline_data: {
                mime_type: UpscaleGeminiDefaultMimeType,
                data: imageBase64.replace(UpscaleGeminiBase64DataUrlPattern, ''),
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: [UpscaleGeminiResponseModalityText, UpscaleGeminiResponseModalityImage],
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`${UpscaleGeminiErrorMessage.RequestFailed}: ${response.status} - ${errorText}`)
  }

  const data = recordFromJson(await response.json())
  const candidate = recordFromJson(recordArrayFromJson(data[UpscaleGeminiCandidatesField])[0])
  if (Object.keys(candidate).length === 0) {
    throw new Error(UpscaleGeminiErrorMessage.NoCandidates)
  }

  const content = recordFromJson(candidate[UpscaleGeminiContentField])
  const imagePart = findGeminiInlineImageData(content[UpscaleGeminiPartsField])
  if (!imagePart) {
    throw new Error(UpscaleGeminiErrorMessage.NoImageInResponse)
  }

  const imageData = readRowString(imagePart, UpscaleGeminiInlineFieldData)
  if (!imageData) {
    throw new Error(UpscaleGeminiErrorMessage.NoImageData)
  }

  const step1MimeType =
    readRowString(imagePart, UpscaleGeminiInlineFieldMimeType) ??
    readRowString(imagePart, UpscaleGeminiInlineFieldMimeTypeAlt) ??
    UpscaleGeminiDefaultMimeType

  logger.info(UpscaleGeminiLogMessage.Step1Complete, {
    mimeType: step1MimeType,
    imageLength: imageData.length,
  })
  await metadata.set(UpscaleTaskMetadataKey.Progress, UpscaleGeminiProgressAfterStep)

  return { step1Image: imageData, step1MimeType }
}
