import { NextResponse } from 'next/server'
import type { TileAIProvider } from '@/trigger/providers/follow-up-provider'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import {
  hasApiframeApiKey,
  imageGenerateModelToTileProvider,
  readApiframeApiKey,
  resolveTileGenerationModel,
} from '@/shared/ai/image-model-env'

interface TileProviderEnv {
  hasApiframe: boolean
}

export function readTileProviderEnv(): TileProviderEnv {
  return {
    hasApiframe: hasApiframeApiKey(),
  }
}

type TileProviderChoice = { aiProvider: TileAIProvider; aiConfig: Record<string, unknown> }

function apiframeConfig(provider: TileAIProvider, model: string): TileProviderChoice {
  return {
    aiProvider: provider,
    aiConfig: {
      apiKey: readApiframeApiKey(),
      model,
    },
  }
}

function choiceFromModel(
  model: ReturnType<typeof resolveTileGenerationModel>,
): TileProviderChoice {
  return apiframeConfig(imageGenerateModelToTileProvider(model), model)
}

export function resolveTileAiProvider(input: {
  isFirstTile: boolean
  env: TileProviderEnv
  models?: Record<string, string | undefined>
}): NextResponse | TileProviderChoice {
  if (!input.env.hasApiframe) {
    return NextResponse.json(
      { error: API_ERROR.APIFRAME_API_KEY_NOT_PROVIDED },
      { status: 500 },
    )
  }

  return choiceFromModel(resolveTileGenerationModel(input.isFirstTile, input.models))
}
