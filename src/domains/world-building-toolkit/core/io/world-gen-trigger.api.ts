import { ContentType, HttpMethod, QueryParam } from '@/shared/data/constants/protocol'
import { fetchJsonRecord } from '@/shared/data/fetch-json-record'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import { buildUrl } from '@/shared/data/url-builder'
import { FidelityApiRoute } from '../../constants/fidelity-service'
import { TileGenerationApiRoute } from '../../constants/tile-generation-service'
import { UpscaleApiRoute } from '../../constants/upscale-service'
import type { VariantSelectionAction } from '../../ui/constants/tile-review-dialog'

const JSON_HEADERS = { 'Content-Type': ContentType.Json }
const TRIGGER_FIDELITY_ERROR = 'Failed to trigger fidelity enhancement task'
const TRIGGER_TILE_GENERATION_ERROR = 'Failed to trigger tile generation task'
const TRIGGER_UPSCALE_ERROR = 'Failed to trigger upscale task'
const TRIGGER_VARIANT_SELECTION_ERROR = 'Failed to trigger variant selection'

export interface WorldGenTriggerStatusResult {
  statusCode: number
  status?: string | null
  output?: Record<string, unknown>
  error?: unknown
  metadata?: Record<string, unknown>
}

async function fetchTriggerRunStatus(
  statusRoute: string,
  runId: string
): Promise<WorldGenTriggerStatusResult> {
  const response = await fetch(buildUrl(statusRoute, { [QueryParam.RunId]: runId }))
  const body = recordFromJson(await response.json().catch(() => ({})))
  return {
    statusCode: response.status,
    status: readString(body.status),
    output: recordFromJson(body.output),
    error: body.error,
    metadata: recordFromJson(body.metadata),
  }
}

export async function triggerFidelityEnhancement(input: {
  tileId: string
  projectId: string
  imageBase64: string
  stylePrompt: string
  creativity: number
  styleReferenceUrls?: string[]
}): Promise<{ runId: string }> {
  const data = await fetchJsonRecord(FidelityApiRoute.Trigger, {
    method: HttpMethod.Post,
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  })
  const runId = readString(data.runId)
  if (!runId) {
    throw new Error(readString(data.error) ?? TRIGGER_FIDELITY_ERROR)
  }
  return { runId }
}

export async function fetchFidelityRunStatus(runId: string): Promise<WorldGenTriggerStatusResult> {
  return fetchTriggerRunStatus(FidelityApiRoute.Status, runId)
}

export async function triggerTileGeneration(input: {
  projectId: string
  x: number
  y: number
  prompt: string
  isFirstTile: boolean
  contextPayload?: unknown
  styleReferenceUrls?: string[]
}): Promise<{ runId: string }> {
  const data = await fetchJsonRecord(TileGenerationApiRoute.Trigger, {
    method: HttpMethod.Post,
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  })
  const runId = readString(data.runId)
  if (!runId) {
    throw new Error(readString(data.error) ?? TRIGGER_TILE_GENERATION_ERROR)
  }
  return { runId }
}

export async function fetchTileGenerationRunStatus(
  runId: string
): Promise<WorldGenTriggerStatusResult> {
  return fetchTriggerRunStatus(TileGenerationApiRoute.Status, runId)
}

export async function completeTileVariantSelection(input: {
  tokenId: string
  action: VariantSelectionAction
  variantIndex: number
}): Promise<void> {
  await fetchJsonRecord(TileGenerationApiRoute.CompleteToken, {
    method: HttpMethod.Post,
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  })
}

export async function triggerUpscale(input: {
  tileId: string
  projectId: string
  imageBase64: string
  prompt: string
  creativity: number
  provider: string
  skipGeminiPreUpscale?: boolean
  styleReferenceUrls?: string[]
}): Promise<{ runId: string }> {
  const data = await fetchJsonRecord(UpscaleApiRoute.Trigger, {
    method: HttpMethod.Post,
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  })
  const runId = readString(data.runId)
  if (!runId) {
    throw new Error(readString(data.error) ?? TRIGGER_UPSCALE_ERROR)
  }
  return { runId }
}

export async function fetchUpscaleRunStatus(runId: string): Promise<WorldGenTriggerStatusResult> {
  return fetchTriggerRunStatus(UpscaleApiRoute.Status, runId)
}

export async function triggerUpscaleVariantSelection(input: {
  tileId: string
  projectId: string
  gridImageUrl: string
  variantIndex: number
}): Promise<{ runId: string }> {
  const data = await fetchJsonRecord(UpscaleApiRoute.SelectVariant, {
    method: HttpMethod.Post,
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  })
  const runId = readString(data.runId)
  if (!runId) {
    throw new Error(readString(data.error) ?? TRIGGER_VARIANT_SELECTION_ERROR)
  }
  return { runId }
}
