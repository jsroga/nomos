import { NextResponse } from 'next/server'
import { resolveFollowUpImageProviderFromEnv, type TileAIProvider } from '@/trigger/providers/follow-up-provider'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { EnvVarName, GoogleModelId } from '@/shared/data/constants/protocol'
import { TileTriggerProvider } from '@/shared/data/constants/trigger-tile-route'
import {
  FOLLOW_UP_IMAGE_MODEL_ENV,
  OpenRouterImageModel,
} from '@/shared/ai/constants/openrouter-image'

interface TileProviderEnv {
  hasLegNext: boolean
  hasGoogle: boolean
  hasOpenRouter: boolean
}

export function readTileProviderEnv(): TileProviderEnv {
  return {
    hasLegNext: !!process.env.LEGNEXT_API_KEY,
    hasGoogle: !!process.env[EnvVarName.GoogleApiKey],
    hasOpenRouter: !!process.env[EnvVarName.OpenRouterApiKey],
  }
}

type TileProviderChoice = { aiProvider: TileAIProvider; aiConfig: Record<string, unknown> }

function grokTileConfig(): TileProviderChoice {
  const modelOverride = process.env[FOLLOW_UP_IMAGE_MODEL_ENV]?.trim()
  return {
    aiProvider: TileTriggerProvider.Grok,
    aiConfig: {
      apiKey: process.env[EnvVarName.OpenRouterApiKey],
      model: modelOverride || OpenRouterImageModel.GrokImagineImageQuality,
    },
  }
}

function geminiTileConfig(provider: TileAIProvider): TileProviderChoice {
  return {
    aiProvider: provider,
    aiConfig: {
      apiKey: process.env[EnvVarName.GoogleApiKey],
      model: GoogleModelId.Gemini3ProImagePreview,
    },
  }
}

function legNextTileConfig(provider: TileAIProvider): TileProviderChoice {
  return { aiProvider: provider, aiConfig: { apiKey: process.env.LEGNEXT_API_KEY } }
}

/**
 * First tile: OpenRouter → Gemini → LegNext/Midjourney.
 * Midjourney is last because LegNext gates tile editing behind an account whitelist.
 */
function resolveFirstTileProvider(env: TileProviderEnv): NextResponse | TileProviderChoice {
  if (env.hasOpenRouter) return grokTileConfig()
  if (env.hasGoogle) return geminiTileConfig(TileTriggerProvider.Gemini)
  if (env.hasLegNext) return legNextTileConfig(TileTriggerProvider.Midjourney)
  return NextResponse.json({ error: API_ERROR.NO_AI_PROVIDER_CONFIGURED }, { status: 500 })
}

export function resolveTileAiProvider(input: {
  isFirstTile: boolean
  env: TileProviderEnv
}): NextResponse | TileProviderChoice {
  const followUpProvider = resolveFollowUpImageProviderFromEnv()

  if (input.isFirstTile) {
    return resolveFirstTileProvider(input.env)
  }

  if (followUpProvider === TileTriggerProvider.Grok) {
    if (!input.env.hasOpenRouter) {
      return NextResponse.json(
        { error: API_ERROR.OPENROUTER_API_KEY_NOT_CONFIGURED_SERVER },
        { status: 500 }
      )
    }
    return grokTileConfig()
  }

  if (followUpProvider === TileTriggerProvider.LegnextUploadPaint && input.env.hasLegNext) {
    return legNextTileConfig(TileTriggerProvider.LegnextUploadPaint)
  }

  if (!input.env.hasGoogle) {
    return NextResponse.json(
      { error: API_ERROR.GOOGLE_API_KEY_NOT_CONFIGURED_SERVER },
      { status: 500 }
    )
  }

  return geminiTileConfig(TileTriggerProvider.NanoBanana)
}
