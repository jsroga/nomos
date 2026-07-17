import { NextResponse } from 'next/server'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { GoogleModelId } from '@/shared/data/constants/protocol'
import { AIProvider } from '@/shared/types/enums'

export enum UpscaleMode {
  Conservative = 'conservative',
  Creative = 'creative',
}

export function isUpscaleMode(value: string | undefined): value is UpscaleMode {
  return value === UpscaleMode.Conservative || value === UpscaleMode.Creative
}

export function resolveUpscaleProviderKey(provider: string): string | undefined {
  const providerKeyMap: Record<string, string | undefined> = {
    [AIProvider.Stability]: process.env.STABILITY_API_KEY,
    midjourney: process.env.LEGNEXT_API_KEY,
    [AIProvider.Replicate]: process.env.REPLICATE_API_TOKEN,
  }
  return providerKeyMap[provider]
}

export function buildUpscaleProviderConfig(payload: {
  providerConfig?: {
    model?: string
    upscaleMode?: string
    parameters?: unknown
  }
}, providerApiKey: string) {
  return {
    apiKey: providerApiKey,
    ...(payload.providerConfig?.model ? { model: payload.providerConfig.model } : {}),
    ...(payload.providerConfig?.upscaleMode
      ? { upscaleMode: payload.providerConfig.upscaleMode }
      : {}),
    ...(payload.providerConfig?.parameters
      ? { parameters: payload.providerConfig.parameters }
      : {}),
  }
}

export function buildGeminiPreUpscaleConfig(
  skipGeminiPreUpscale: boolean
): NextResponse | { geminiConfig?: { apiKey: string; model: GoogleModelId } } {
  const geminiApiKey = process.env.GOOGLE_API_KEY
  if (!skipGeminiPreUpscale && !geminiApiKey) {
    return NextResponse.json({ error: API_ERROR.GOOGLE_API_KEY_GEMINI_PREUPSCALE }, { status: 500 })
  }

  const geminiConfig =
    skipGeminiPreUpscale || !geminiApiKey
      ? undefined
      : { apiKey: geminiApiKey, model: GoogleModelId.Gemini3ProImagePreview }

  return { geminiConfig }
}

export function validateUpscaleProvider(provider: string): NextResponse | { providerApiKey: string } {
  const providerApiKey = resolveUpscaleProviderKey(provider)
  if (!providerApiKey) {
    return NextResponse.json(
      { error: `API key not configured on server for upscale provider: ${provider}` },
      { status: 500 }
    )
  }
  return { providerApiKey }
}
