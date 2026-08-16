import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveStyleContext } from '@/shared/data/constants/style-presets'
import { readString, readNumber, recordFromJson, stringArrayFromJson } from '@/shared/data/json-guards'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { DB_COLUMN, DB_SELECT, DB_TABLE } from '@/shared/data/constants/db-tables'
import {
  generationModeDef,
  resolveGenerationMode,
} from '@/domains/2d-canvas/constants/generation-modes'
import { absolutizeStyleReferenceUrls } from '@/domains/2d-canvas/constants/mj-sref'
import { getSiteURL } from '@/shared/data/url'
import type {
  GenerateTileContextPayload,
  GenerateTilePayload,
} from '@/domains/2d-canvas/tasks/constants/generate-tile'
import { packedCropFromContext } from '@/domains/2d-canvas/tasks/constants/generate-tile'
import type { PackedCropRect, PackedCropSpec } from '@/shared/ai/context-pack-layout'
import { ContextAssemblyVariant } from '@/domains/2d-canvas/constants/tile-generation-service'
import type { TileAIProvider } from '@/trigger/providers/follow-up-provider'

enum TileContextPayloadKey {
  Images = 'images',
  PreferredVariant = 'preferredVariant',
  CropRect = 'cropRect',
  PackedWidth = 'packedWidth',
  PackedHeight = 'packedHeight',
}

export interface TileRequestPayload {
  projectId: string
  x: number
  y: number
  prompt: string
  isFirstTile?: boolean
  styleReferenceUrls?: string[]
  contextPayload?: unknown
  packedCrop?: unknown
  contextImageBase64?: string
  neighborImageUrls?: GenerateTilePayload['neighborImageUrls']
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

function parseCropRect(value: unknown): PackedCropRect | undefined {
  const record = recordFromJson(value)
  const x = readNumber(record.x)
  const y = readNumber(record.y)
  const width = readNumber(record.width)
  const height = readNumber(record.height)
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    return undefined
  }
  return { x, y, width, height }
}

function parseContextImages(value: unknown): GenerateTileContextPayload['images'] | undefined {
  const record = recordFromJson(value)
  const images: GenerateTileContextPayload['images'] = {}
  const canonical = record[ContextAssemblyVariant.CanonicalFullContext]
  const smartSeam = record[ContextAssemblyVariant.SmartSeamContext]
  if (typeof canonical === 'string') {
    images[ContextAssemblyVariant.CanonicalFullContext] = canonical
  }
  if (typeof smartSeam === 'string') {
    images[ContextAssemblyVariant.SmartSeamContext] = smartSeam
  }
  if (!images[ContextAssemblyVariant.CanonicalFullContext] && !images[ContextAssemblyVariant.SmartSeamContext]) {
    return undefined
  }
  return images
}

function parseGenerateTileContextPayload(value: unknown): GenerateTileContextPayload | undefined {
  if (!value || typeof value !== 'object' || !(TileContextPayloadKey.Images in value)) {
    return undefined
  }

  const record = recordFromJson(value)
  const images = parseContextImages(record[TileContextPayloadKey.Images])
  if (!images) return undefined

  const preferredVariant = readString(record[TileContextPayloadKey.PreferredVariant])
  const cropRect = parseCropRect(record[TileContextPayloadKey.CropRect])
  const packedWidth = readNumber(record[TileContextPayloadKey.PackedWidth])
  const packedHeight = readNumber(record[TileContextPayloadKey.PackedHeight])
  const parsed: GenerateTileContextPayload = preferredVariant
    ? { images, preferredVariant }
    : { images }
  if (cropRect) parsed.cropRect = cropRect
  if (packedWidth !== undefined) parsed.packedWidth = packedWidth
  if (packedHeight !== undefined) parsed.packedHeight = packedHeight
  return parsed
}

function parsePackedCropSpec(value: unknown): PackedCropSpec | undefined {
  const record = recordFromJson(value)
  return packedCropFromContext({
    images: {},
    cropRect: parseCropRect(record[TileContextPayloadKey.CropRect]),
    packedWidth: readNumber(record[TileContextPayloadKey.PackedWidth]),
    packedHeight: readNumber(record[TileContextPayloadKey.PackedHeight]),
  })
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
  styleAnchorUrl?: string
}> {
  const { data: projectData } = await supabase
    .from(DB_TABLE.PROJECTS)
    .select(DB_SELECT.PROJECT_STYLE_REFS)
    .eq(DB_COLUMN.ID, payload.projectId)
    .single()

  const stylePreset = readString(projectData?.style_preset) ?? null
  const styleContext = resolveStyleContext({ stylePreset }) ?? undefined
  const mode = generationModeDef(resolveGenerationMode(projectData?.generation_mode))
  const masterPrompt = readString(projectData?.canvas_master_prompt) ?? undefined
  const styleAnchorUrl = readString(projectData?.style_anchor_url) ?? undefined

  const styleReferenceUrls = absolutizeStyleReferenceUrls(
    payload.styleReferenceUrls && payload.styleReferenceUrls.length > 0
      ? payload.styleReferenceUrls
      : stringArrayFromJson(projectData?.style_reference_urls),
    getSiteURL(),
  )

  return {
    styleReferenceUrls,
    styleContext,
    masterPrompt,
    modePromptFragment: mode.promptFragment,
    modeNegatives: mode.negatives,
    styleAnchorUrl,
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
    styleAnchorUrl?: string
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

  if (styleInputs.styleReferenceUrls?.length) {
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
  if (styleInputs.styleAnchorUrl) {
    taskPayload.styleAnchorUrl = styleInputs.styleAnchorUrl
  }
  if (payload.contextImageBase64) {
    taskPayload.contextImageBase64 = payload.contextImageBase64
  }
  if (payload.neighborImageUrls) {
    taskPayload.neighborImageUrls = payload.neighborImageUrls
  }

  const contextPayload = parseGenerateTileContextPayload(payload.contextPayload)
  if (contextPayload) {
    taskPayload.contextPayload = contextPayload
  }
  const packedCrop = parsePackedCropSpec(payload.packedCrop) ?? packedCropFromContext(contextPayload)
  if (packedCrop) taskPayload.packedCrop = packedCrop

  return taskPayload
}
