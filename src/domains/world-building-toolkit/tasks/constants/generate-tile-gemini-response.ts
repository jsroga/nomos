import {
  logLLMRequestComplete,
  logLLMRequestError,
} from '@/trigger/utils/llm-logger'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import {
  readGeminiImageData,
  type GeminiContentPart,
  type GeminiResponse,
} from './generate-tile-json-guards'
import { GeminiFinishReason } from '@/shared/data/constants/repaint-gemini'

interface GeminiLogContext {
  model: string
  prompt: string
  payload: unknown
}

function logGeminiCandidateError(
  ctx: GeminiLogContext,
  error: string,
  output?: unknown
): never {
  logLLMRequestError({
    provider: ImageGenProvider.Gemini,
    model: ctx.model,
    prompt: ctx.prompt,
    error,
    input: ctx.payload,
    output,
  })
  throw new Error(error)
}

function findGeminiImagePart(parts: GeminiContentPart[]): GeminiContentPart | undefined {
  return parts.find(part => Boolean(readGeminiImageData(part)))
}

function findGeminiTextPart(parts: GeminiContentPart[]): GeminiContentPart | undefined {
  return parts.find(part => typeof part.text === 'string' && part.text.length > 0)
}

export async function extractGeminiImageData(
  data: GeminiResponse,
  ctx: GeminiLogContext,
  processImage: (imagePart: GeminiContentPart) => Promise<string>
): Promise<string> {
  const candidate = data.candidates?.[0]
  if (!candidate) {
    return logGeminiCandidateError(ctx, 'No candidates returned from Gemini', data)
  }

  if (candidate.finishReason === GeminiFinishReason.Safety) {
    return logGeminiCandidateError(ctx, 'Generation blocked by safety filters', data)
  }

  const parts = candidate.content?.parts ?? []
  if (parts.length === 0) {
    return logGeminiCandidateError(ctx, 'No content parts returned', data)
  }

  const imagePart = findGeminiImagePart(parts)
  if (imagePart) {
    const imageData = await processImage(imagePart)
    logLLMRequestComplete({
      provider: ImageGenProvider.Gemini,
      model: ctx.model,
      prompt: ctx.prompt,
      outputImageUrls: ['[Base64 Image Data]'],
      output: { finishReason: candidate.finishReason, hasImage: true },
    })
    return imageData
  }

  const textPart = findGeminiTextPart(parts)
  if (textPart?.text) {
    const errorMsg = `Gemini returned text instead of image: ${textPart.text.substring(0, 100)}...`
    return logGeminiCandidateError(ctx, errorMsg, data)
  }

  return logGeminiCandidateError(ctx, 'No image found in Gemini response', data)
}
