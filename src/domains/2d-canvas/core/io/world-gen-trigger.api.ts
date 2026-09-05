import { ContentType, HttpMethod, QueryParam } from '@/shared/data/constants/protocol'
import { TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { withSubmissionNonce } from '@/shared/jobs/submission-nonce'
import { TRIGGER_STATUS_FETCH_INIT } from '@/shared/data/constants/polling'
import { fetchJsonRecord, readJsonBody } from '@/shared/data/fetch-json-record'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import { buildUrl } from '@/shared/data/url-builder'
import { FidelityApiRoute } from '../../constants/fidelity-service'
import { TileGenerationApiRoute, VariantSelectionAction } from '../../constants/tile-generation-service'
import { UpscaleApiRoute } from '../../constants/upscale-service'
import type { NeighborImageUrls } from '../neighbor-image-urls'
import type { PackedCropSpec } from '@/shared/ai/context-pack-layout'

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
  const response = await fetch(buildUrl(statusRoute, { [QueryParam.RunId]: runId }), TRIGGER_STATUS_FETCH_INIT)
  const body = recordFromJson(await readJsonBody(response, {}))
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
  return withSubmissionNonce(
    `${TRIGGER_TASK_ID.ENHANCE_FIDELITY}:${input.tileId}`,
    async requestId => {
      const data = await fetchJsonRecord(FidelityApiRoute.Trigger, {
        method: HttpMethod.Post,
        headers: JSON_HEADERS,
        body: JSON.stringify({ ...input, requestId }),
      })
      const runId = readString(data.runId)
      if (!runId) {
        throw new Error(readString(data.error) ?? TRIGGER_FIDELITY_ERROR)
      }
      return { runId }
    }
  )
}

export async function fetchFidelityRunStatus(runId: string): Promise<WorldGenTriggerStatusResult> {
  return fetchTriggerRunStatus(FidelityApiRoute.Status, runId)
}

interface TileGenerationInput {
  projectId: string
  x: number
  y: number
  prompt: string
  isFirstTile: boolean
  packedCrop?: PackedCropSpec
  contextPayload?: unknown
  styleReferenceUrls?: string[]
  neighborImageUrls?: NeighborImageUrls
}

export async function triggerTileGeneration(
  input: TileGenerationInput
): Promise<{ runId: string }> {
  return withSubmissionNonce(
    `${TRIGGER_TASK_ID.GENERATE_TILE}:${input.projectId}:${input.x},${input.y}`,
    requestId => postTileGeneration(input, requestId)
  )
}

async function postTileGeneration(
  input: TileGenerationInput,
  requestId: string
): Promise<{ runId: string }> {
  const body: Record<string, unknown> = { requestId }
  if (input.packedCrop) body.packedCrop = input.packedCrop
  body.projectId = input.projectId
  body.x = input.x
  body.y = input.y
  body.prompt = input.prompt
  body.isFirstTile = input.isFirstTile
  if (input.contextPayload) body.contextPayload = input.contextPayload
  if (input.styleReferenceUrls?.length) body.styleReferenceUrls = input.styleReferenceUrls
  if (input.neighborImageUrls && Object.keys(input.neighborImageUrls).length > 0) {
    body.neighborImageUrls = input.neighborImageUrls
  }
  const data = await fetchJsonRecord(TileGenerationApiRoute.Trigger, {
    method: HttpMethod.Post,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
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
  runId: string
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
  return withSubmissionNonce(`${TRIGGER_TASK_ID.UPSCALE_TILE}:${input.tileId}`, async requestId => {
    const data = await fetchJsonRecord(UpscaleApiRoute.Trigger, {
      method: HttpMethod.Post,
      headers: JSON_HEADERS,
      body: JSON.stringify({ ...input, requestId }),
    })
    const runId = readString(data.runId)
    if (!runId) {
      throw new Error(readString(data.error) ?? TRIGGER_UPSCALE_ERROR)
    }
    return { runId }
  })
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
  return withSubmissionNonce(
    `${TRIGGER_TASK_ID.SELECT_MJ_VARIANT}:${input.tileId}:${input.variantIndex}`,
    async requestId => {
      const data = await fetchJsonRecord(UpscaleApiRoute.SelectVariant, {
        method: HttpMethod.Post,
        headers: JSON_HEADERS,
        body: JSON.stringify({ ...input, requestId }),
      })
      const runId = readString(data.runId)
      if (!runId) {
        throw new Error(readString(data.error) ?? TRIGGER_VARIANT_SELECTION_ERROR)
      }
      return { runId }
    }
  )
}
