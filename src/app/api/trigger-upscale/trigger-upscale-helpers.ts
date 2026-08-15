import { NextResponse } from 'next/server'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { EnvVarName } from '@/shared/data/constants/protocol'
import { FeatureFlag, isFeatureEnabled } from '@/shared/data/constants/feature-flags'
import { UpscaleStrategy } from '@/domains/2d-canvas/constants/generation-modes'

export enum UpscaleMode {
  Conservative = 'conservative',
  Creative = 'creative',
}

export function isUpscaleMode(value: string | undefined): value is UpscaleMode {
  return value === UpscaleMode.Conservative || value === UpscaleMode.Creative
}

/** All upscale providers authenticate with Apiframe. */
export function resolveUpscaleProviderKey(_provider: string): string | undefined {
  return process.env.APIFRAME_API_KEY
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

export function validateUpscaleProvider(provider: string): NextResponse | { providerApiKey: string } {
  const providerApiKey = resolveUpscaleProviderKey(provider)
  if (!providerApiKey) {
    return NextResponse.json(
      { error: API_ERROR.APIFRAME_API_KEY_NOT_PROVIDED },
      { status: 500 },
    )
  }
  return { providerApiKey }
}

export function resolveModeUpscaleAuth(strategy: UpscaleStrategy): NextResponse | {
  providerApiKey: string
  geminiConfig?: { apiKey: string }
} {
  if (strategy === UpscaleStrategy.NearestNeighbour) {
    return { providerApiKey: '' }
  }
  const token = process.env[EnvVarName.ReplicateApiToken]
  if (!token) {
    return NextResponse.json({ error: API_ERROR.REPLICATE_TOKEN_NOT_CONFIGURED }, { status: 500 })
  }
  if (!isFeatureEnabled(FeatureFlag.CanvasGeminiUpscale)) {
    return { providerApiKey: token }
  }
  const googleKey = process.env[EnvVarName.GoogleApiKey]
  if (!googleKey) {
    return NextResponse.json({ error: API_ERROR.GOOGLE_API_KEY_GEMINI_PREUPSCALE }, { status: 500 })
  }
  return { providerApiKey: token, geminiConfig: { apiKey: googleKey } }
}
