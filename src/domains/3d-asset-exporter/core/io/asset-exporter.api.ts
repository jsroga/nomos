import { TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { withSubmissionNonce } from '@/shared/jobs/submission-nonce'
import { ApiRoutePath, ContentType, HttpMethod, JsonField, QueryParam } from '@/shared/data/constants/protocol'
import { TRIGGER_STATUS_FETCH_INIT } from '@/shared/data/constants/polling'
import { fetchJsonRecord } from '@/shared/data/fetch-json-record'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import type { TriggerRunStatusPayload } from '@/shared/data/polling/wait-for-trigger-run'
import { buildUrl, joinUrlPath } from '@/shared/data/url-builder'

import { AssetExporterApiRoute, MeshyApiRoute } from '../../constants/asset-exporter-api'

const JSON_HEADERS = { 'Content-Type': ContentType.Json }
const START_3D_GENERATION_ERROR = 'Failed to start 3D generation'
const START_REMESH_ERROR = 'Failed to start remesh'
const START_UPLOAD_ERROR = 'Failed to start upload'

export async function fetchAsset(assetId: string): Promise<Record<string, unknown>> {
  return fetchJsonRecord(joinUrlPath(AssetExporterApiRoute.Assets, assetId))
}

export async function patchAsset(
  assetId: string,
  body: Record<string, unknown>
): Promise<void> {
  await fetchJsonRecord(joinUrlPath(AssetExporterApiRoute.Assets, assetId), {
    method: HttpMethod.Patch,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  })
}

export async function fetchTrigger3dRunStatus(
  runId: string
): Promise<TriggerRunStatusPayload & { statusCode: number; metadata?: Record<string, unknown> }> {
  const response = await fetch(
    buildUrl(AssetExporterApiRoute.Trigger3dStatus, { [QueryParam.RunId]: runId }),
    TRIGGER_STATUS_FETCH_INIT,
  )
  const data = recordFromJson(await response.json().catch(() => ({})))
  return {
    statusCode: response.status,
    status: readString(data.status),
    output: recordFromJson(data.output),
    error: data.error,
    metadata: recordFromJson(data.metadata),
  }
}

export async function trigger3dGeneration(input: {
  projectId: string
  assetId: string
  imageUrl: string
  provider: string
  apiKey: string
  topology: 'quad' | 'triangle'
  targetPolycount: number
}): Promise<{ runId: string }> {
  const data = await withSubmissionNonce(
    `${TRIGGER_TASK_ID.GENERATE_3D_MODEL}:${input.assetId}`,
    requestId =>
      fetchJsonRecord(AssetExporterApiRoute.Trigger3d, {
        method: HttpMethod.Post,
        headers: JSON_HEADERS,
        body: JSON.stringify({ ...input, requestId }),
      })
  )
  const runId = readString(data.runId)
  if (!runId) {
    throw new Error(readString(data.error) ?? START_3D_GENERATION_ERROR)
  }
  return { runId }
}

export async function trigger3dRemesh(input: {
  assetId: string
  meshyTaskId: string
  apiKey: string
  topology: 'quad' | 'triangle'
  targetPolycount: number
  resizeHeight?: number
}): Promise<{ runId: string }> {
  const data = await withSubmissionNonce(
    `${TRIGGER_TASK_ID.REMESH_3D_MODEL}:${input.assetId}:${input.targetPolycount}`,
    requestId =>
      fetchJsonRecord(AssetExporterApiRoute.Trigger3dRemesh, {
        method: HttpMethod.Post,
        headers: JSON_HEADERS,
        body: JSON.stringify({ ...input, requestId }),
      })
  )
  const runId = readString(data.runId)
  if (!runId) {
    throw new Error(readString(data.error) ?? START_REMESH_ERROR)
  }
  return { runId }
}

export async function triggerModelUpload(input: {
  projectId: string
  assetId: string
  modelFilename: string
}): Promise<{ runId: string }> {
  const data = await withSubmissionNonce(
    `${TRIGGER_TASK_ID.UPLOAD_ASSET}:${input.assetId}:${input.modelFilename}`,
    requestId =>
      fetchJsonRecord(AssetExporterApiRoute.TriggerUpload, {
        method: HttpMethod.Post,
        headers: JSON_HEADERS,
        body: JSON.stringify({ ...input, requestId }),
      })
  )
  const runId = readString(data.runId)
  if (!runId) {
    throw new Error(readString(data.error) ?? START_UPLOAD_ERROR)
  }
  return { runId }
}

export async function fetchMeshyImageTo3dTask(
  taskId: string,
  apiKey: string
): Promise<Record<string, unknown>> {
  return fetchJsonRecord(joinUrlPath(MeshyApiRoute.ImageTo3dV1, taskId), {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
}

export async function saveAssetImage(input: {
  projectId: string
  filename: string
  imageData: string
}): Promise<{ url?: string }> {
  const data = await fetchJsonRecord(AssetExporterApiRoute.SaveImage, {
    method: HttpMethod.Post,
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  })
  const url = readString(data[JsonField.Url])
  return url ? { url } : {}
}

export async function fetchProxiedModelBlob(url: string): Promise<Blob> {
  const response = await fetch(buildUrl(ApiRoutePath.ProxyModel, { url }))
  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`)
  }
  return response.blob()
}
