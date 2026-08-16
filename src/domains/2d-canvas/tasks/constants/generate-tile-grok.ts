import { GENERATION_PROMPTS, tilePromptLayersFrom } from '@/shared/data/server/prompts'
import {
  logLLMRequestError,
  logLLMRequestStart,
} from '@/trigger/utils/llm-logger'
import type { AiProviderConfig } from '@/shared/ai/ai-provider-config'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import {
  OpenRouterImageAspectRatio,
  OpenRouterImageModel,
  OpenRouterImagePath,
  OpenRouterImageResolution,
} from '@/shared/ai/constants/openrouter-image'
import { OPENROUTER_BASE_URL } from '@/shared/agent-kernel/models'
import { ContentType, HttpMethod } from '@/shared/data/constants/protocol'
import { readOpenAiB64Json } from './generate-tile-json-guards'
import { toTilePngBase64 } from './generate-tile-output'

enum OpenRouterImageInputType {
  ImageUrl = 'image_url',
}

interface OpenRouterImageReference {
  type: OpenRouterImageInputType.ImageUrl
  image_url: { url: string }
}

function resolveGrokModel(config: AiProviderConfig): string {
  return config.params?.modelId ?? config.model ?? OpenRouterImageModel.GrokImagineImageQuality
}

function buildContextDataUrl(contextImageBase64: string): string {
  return `data:${ContentType.Png};base64,${contextImageBase64}`
}

/**
 * Follow-up (and optional first-tile) generation via OpenRouter Image API → Grok Imagine.
 * @see https://openrouter.ai/x-ai/grok-imagine-image-quality
 */
export async function generateWithGrok(
  prompt: string,
  config: AiProviderConfig,
  isFirstTile: boolean,
  styleReferenceUrls: string[] | undefined,
  contextImageBase64: string | undefined,
  styleContext: string | undefined,
  masterPrompt?: string,
  modePromptFragment?: string,
): Promise<string> {
  const model = resolveGrokModel(config)
  const layers = tilePromptLayersFrom({
    prompt,
    masterPrompt,
    modePromptFragment,
    styleContext,
  })
  const isFollowUp = !isFirstTile && !!contextImageBase64
  const finalPrompt = isFollowUp
    ? GENERATION_PROMPTS.FOLLOW_UP.MASTER(layers)
    : GENERATION_PROMPTS.FIRST_TILE.GEMINI(layers)

  const inputReferences: OpenRouterImageReference[] = []
  if (contextImageBase64) {
    inputReferences.push({
      type: OpenRouterImageInputType.ImageUrl,
      image_url: { url: buildContextDataUrl(contextImageBase64) },
    })
  }
  for (const url of styleReferenceUrls ?? []) {
    inputReferences.push({
      type: OpenRouterImageInputType.ImageUrl,
      image_url: { url },
    })
  }

  const payload = {
    model,
    prompt: finalPrompt,
    n: 1,
    aspect_ratio: OpenRouterImageAspectRatio.Square,
    resolution: OpenRouterImageResolution.OneK,
    ...(inputReferences.length > 0 ? { input_references: inputReferences } : {}),
  }

  logLLMRequestStart({
    provider: ImageGenProvider.Grok,
    model,
    prompt: finalPrompt,
    inputImageUrls: styleReferenceUrls,
    input: { ...payload, input_references: inputReferences.map((r) => r.image_url.url.slice(0, 64)) },
    metadata: { isFirstTile, endpoint: OpenRouterImagePath.Images },
  })

  const response = await fetch(`${OPENROUTER_BASE_URL}${OpenRouterImagePath.Images}`, {
    method: HttpMethod.Post,
    headers: {
      'Content-Type': ContentType.Json,
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    logLLMRequestError({
      provider: ImageGenProvider.Grok,
      model,
      prompt: finalPrompt,
      error: `HTTP ${response.status}: ${errorText}`,
      input: payload,
    })
    throw new Error(`OpenRouter Grok image error: ${response.status} - ${errorText}`)
  }

  const b64 = readOpenAiB64Json(await response.json())
  if (!b64) {
    logLLMRequestError({
      provider: ImageGenProvider.Grok,
      model,
      prompt: finalPrompt,
      error: 'No image data in OpenRouter response',
      input: payload,
    })
    throw new Error('No image data in OpenRouter Grok response')
  }

  return toTilePngBase64(b64, isFirstTile)
}
