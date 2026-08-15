import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveStyleReferenceUrls, resolveStyleContext } from '@/shared/data/constants/style-presets'
import { readString, stringArrayFromJson } from '@/shared/data/json-guards'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { DB_COLUMN, DB_SELECT, DB_TABLE } from '@/shared/data/constants/db-tables'
import {
  generationModeDef,
  resolveGenerationMode,
} from '@/domains/2d-canvas/constants/generation-modes'
import type {
  GenerateTileContextPayload,
  GenerateTilePayload,
} from '@/domains/2d-canvas/tasks/constants/generate-tile'
import type { TileAIProvider } from '@/trigger/providers/follow-up-provider'

enum TileContextPayloadKey {
  Images = 'images',
  PreferredVariant = 'preferredVariant',
}

export interface TileRequestPayload {
  projectId: string
  x: number
  y: number
  prompt: string
  isFirstTile?: boolean
  styleReferenceUrls?: string[]
  contextPayload?: unknown
  contextImageBase64?: string
}

export function validateTileRequestPayload(payload: TileRequestPayload): NextResponse | null {
  if (
    !payload.projectId ||
    payload.x === undefined ||
    payload.y === undefined ||
    payload.prompt === undefined
  ) {
    return NextResponse.json({ error: API_ERROR.MISSING_TILE_TRIGGER_FIELDS }, { status: 400 })
  }
  return null
}

function parseGenerateTileContextPayload(value: unknown): GenerateTileContextPayload | undefined {
  if (!value || typeof value !== 'object' || !(TileContextPayloadKey.Images in value)) {
    return undefined
  }

  const record = value
  const images = record[TileContextPayloadKey.Images]
  if (!images || typeof images !== 'object') return undefined

  const preferredVariant =
    TileContextPayloadKey.PreferredVariant in record &&
    typeof record[TileContextPayloadKey.PreferredVariant] === 'string'
      ? record[TileContextPayloadKey.PreferredVariant]
      : undefined

  return preferredVariant ? { images, preferredVariant } : { images }
}

export async function resolveTileStyleInputs(
  supabase: SupabaseClient,
  payload: TileRequestPayload
): Promise<{
  styleReferenceUrls?: string[]
  styleContext?: string
  masterPrompt?: string
  modePromptFragment?: string
  modeNegatives?: string[]
}> {
  const { data: projectData } = await supabase
    .from(DB_TABLE.PROJECTS)
    .select(DB_SELECT.PROJECT_STYLE_REFS)
    .eq(DB_COLUMN.ID, payload.projectId)
    .single()

  const stylePreset = readString(projectData?.style_preset) ?? null
  const styleContext = resolveStyleContext({ stylePreset }) ?? undefined
  const mode = generationModeDef(resolveGenerationMode(projectData?.generation_mode))
  const masterPrompt = readString(projectData?.master_prompt) ?? undefined

  const styleReferenceUrls =
    payload.styleReferenceUrls && payload.styleReferenceUrls.length > 0
      ? payload.styleReferenceUrls
      : resolveStyleReferenceUrls({
          stylePreset,
          styleReferenceUrls: stringArrayFromJson(projectData?.style_reference_urls),
        }) ?? undefined

  return {
    styleReferenceUrls,
    styleContext,
    masterPrompt,
    modePromptFragment: mode.promptFragment,
    modeNegatives: mode.negatives,
  }
}

export function buildGenerateTileTaskPayload(
  payload: TileRequestPayload,
  providerResult: { aiProvider: TileAIProvider; aiConfig: Record<string, unknown> },
  styleInputs: {
    styleReferenceUrls?: string[]
    styleContext?: string
    masterPrompt?: string
    modePromptFragment?: string
    modeNegatives?: string[]
  }
): GenerateTilePayload {
  const taskPayload: GenerateTilePayload = {
    projectId: payload.projectId,
    x: payload.x,
    y: payload.y,
    prompt: payload.prompt,
    aiProvider: providerResult.aiProvider,
    aiConfig: providerResult.aiConfig,
    isFirstTile: payload.isFirstTile ?? true,
  }

  if (styleInputs.styleReferenceUrls) {
    taskPayload.styleReferenceUrls = styleInputs.styleReferenceUrls
  }
  if (styleInputs.styleContext) {
    taskPayload.styleContext = styleInputs.styleContext
  }
  if (styleInputs.masterPrompt) {
    taskPayload.masterPrompt = styleInputs.masterPrompt
  }
  if (styleInputs.modePromptFragment) {
    taskPayload.modePromptFragment = styleInputs.modePromptFragment
  }
  if (styleInputs.modeNegatives?.length) {
    taskPayload.modeNegatives = styleInputs.modeNegatives
  }
  if (payload.contextImageBase64) {
    taskPayload.contextImageBase64 = payload.contextImageBase64
  }

  const contextPayload = parseGenerateTileContextPayload(payload.contextPayload)
  if (contextPayload) {
    taskPayload.contextPayload = contextPayload
  }

  return taskPayload
}
