import { NextResponse } from 'next/server'
import { resolveFollowUpImageProviderFromEnv, type TileAIProvider } from '@/trigger/providers/follow-up-provider'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { EnvVarName, GoogleModelId } from '@/shared/data/constants/protocol'
import { TileTriggerProvider } from '@/shared/data/constants/trigger-tile-route'

interface TileProviderEnv {
  hasLegNext: boolean
  hasGoogle: boolean
}

export function readTileProviderEnv(): TileProviderEnv {
  return {
    hasLegNext: !!process.env.LEGNEXT_API_KEY,
    hasGoogle: !!process.env[EnvVarName.GoogleApiKey],
  }
}

export function resolveTileAiProvider(input: {
  isFirstTile: boolean
  env: TileProviderEnv
}): NextResponse | { aiProvider: TileAIProvider; aiConfig: Record<string, unknown> } {
  const followUpProvider = resolveFollowUpImageProviderFromEnv()

  if (!input.env.hasLegNext && !input.env.hasGoogle) {
    return NextResponse.json({ error: API_ERROR.NO_AI_PROVIDER_CONFIGURED }, { status: 500 })
  }

  if (input.isFirstTile) {
    if (input.env.hasLegNext) {
      return {
        aiProvider: TileTriggerProvider.Midjourney,
        aiConfig: { apiKey: process.env.LEGNEXT_API_KEY },
      }
    }
    return {
      aiProvider: TileTriggerProvider.Gemini,
      aiConfig: {
        apiKey: process.env[EnvVarName.GoogleApiKey],
        model: GoogleModelId.Gemini3ProImagePreview,
      },
    }
  }

  if (followUpProvider === TileTriggerProvider.LegnextUploadPaint && input.env.hasLegNext) {
    return {
      aiProvider: TileTriggerProvider.LegnextUploadPaint,
      aiConfig: { apiKey: process.env.LEGNEXT_API_KEY },
    }
  }

  if (!input.env.hasGoogle) {
    return NextResponse.json(
      { error: API_ERROR.GOOGLE_API_KEY_NOT_CONFIGURED_SERVER },
      { status: 500 }
    )
  }

  return {
    aiProvider: TileTriggerProvider.NanoBanana,
    aiConfig: {
      apiKey: process.env[EnvVarName.GoogleApiKey],
      model: GoogleModelId.Gemini3ProImagePreview,
    },
  }
}
