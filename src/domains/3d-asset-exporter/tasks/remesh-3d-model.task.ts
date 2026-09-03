import { logger, metadata } from '@trigger.dev/sdk'
import { JobQueue, defineOwnedTask } from '@/shared/jobs'
import { remeshRequestToWire } from '../contracts'
import {
  remesh3dModelPayloadSchema,
  type Remesh3dModelPayload,
} from './constants/meshy-payloads'
import { supabaseAdmin } from '@/shared/auth/supabase-admin'
import { recordFromJson, readRowString } from '@/shared/data/json-guards'
import { ContentType, HttpMethod } from '@/shared/data/constants/protocol'
import {
  MeshyTaskStatusValue,
  parseMeshyTask,
  type MeshyTask,
} from './constants/meshy-task-types'

export enum RemeshMetadataKey {
  Progress = 'progress',
  MeshyTaskId = 'meshy_task_id',
  RemeshTaskId = 'remesh_task_id',
}

function buildRemeshBody(payload: Remesh3dModelPayload): Record<string, unknown> {
  return remeshRequestToWire(payload)
}

function parseMeshyApiError(errText: string, statusText: string): string {
  try {
    const errJson = recordFromJson(JSON.parse(errText))
    return (
      (typeof errJson.message === 'string' ? errJson.message : undefined) ??
      (typeof errJson.error === 'string' ? errJson.error : undefined) ??
      statusText
    )
  } catch {
    return statusText
  }
}

async function createRemeshTask(
  apiKey: string,
  remeshBody: Record<string, unknown>,
): Promise<string> {
  const createResponse = await fetch('https://api.meshy.ai/openapi/v1/remesh', {
    method: HttpMethod.Post,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': ContentType.Json,
    },
    body: JSON.stringify(remeshBody),
  })

  if (!createResponse.ok) {
    const errText = await createResponse.text()
    logger.error('Remesh API error:', { status: createResponse.status, body: errText })
    const errMessage = parseMeshyApiError(errText, createResponse.statusText)
    throw new Error(`Meshy Remesh API error: ${errMessage}`)
  }

  const createJson = recordFromJson(await createResponse.json())
  const remeshTaskId = createJson.result
  if (typeof remeshTaskId !== 'string') {
    throw new Error('Meshy remesh API did not return a task id')
  }
  return remeshTaskId
}

async function fetchRemeshStatus(apiKey: string, remeshTaskId: string): Promise<MeshyTask> {
  const statusResponse = await fetch(`https://api.meshy.ai/openapi/v1/remesh/${remeshTaskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (!statusResponse.ok) {
    logger.error('Remesh status check failed:', { status: statusResponse.status })
    throw new Error('Failed to check remesh task status')
  }

  return parseMeshyTask(await statusResponse.json())
}

async function pollRemeshUntilDone(apiKey: string, remeshTaskId: string): Promise<MeshyTask> {
  const maxAttempts = 120
  let lastStatus: string = MeshyTaskStatusValue.Pending
  let lastResult: MeshyTask | null = null

  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    await new Promise(resolve => setTimeout(resolve, 15000))
    lastResult = await fetchRemeshStatus(apiKey, remeshTaskId)
    lastStatus = lastResult.status

    const progress = lastResult.progress ?? 0
    await metadata.set(RemeshMetadataKey.Progress, progress)
    logger.info(
      `Meshy remesh status: ${lastStatus}, Progress: ${progress}% (attempt ${attempts + 1}/${maxAttempts})`,
      { result: lastResult },
    )

    if (lastStatus === MeshyTaskStatusValue.Succeeded) {
      return lastResult
    }
    if (lastStatus === MeshyTaskStatusValue.Failed) {
      throw new Error(`Meshy remesh failed: ${lastResult.taskError?.message ?? 'Unknown error'}`)
    }
  }

  throw new Error(
    `Meshy remesh timed out after 30 minutes. Last status: ${lastStatus}, Progress: ${lastResult?.progress ?? 0}%`,
  )
}

async function persistRemeshResult(
  assetId: string,
  remeshTaskId: string,
  result: MeshyTask,
): Promise<void> {
  try {
    const { data: asset } = await supabaseAdmin
      .from('assets')
      .select('metadata')
      .eq('id', assetId)
      .single()

    const currentMetadata = recordFromJson(asset?.metadata)

    await supabaseAdmin
      .from('assets')
      .update({
        metadata: {
          ...currentMetadata,
          remesh_status: 'completed',
          remesh_meshy_task_id: remeshTaskId,
          remesh_result: result,
        },
      })
      .eq('id', assetId)
  } catch (dbErr) {
    logger.error('DB update failed but Meshy remesh succeeded', { dbErr })
    throw dbErr
  }
}

export async function runRemesh3dModel(payload: Remesh3dModelPayload) {
  const { assetId, meshyTaskId, apiKey } = payload

  logger.info(`Remeshing 3D model for asset ${assetId}, original task: ${meshyTaskId}`)

  await metadata.set(RemeshMetadataKey.Progress, 0)
  await metadata.set(RemeshMetadataKey.MeshyTaskId, meshyTaskId)

  const storedRemeshId = readRowString(
    recordFromJson(metadata.current()),
    RemeshMetadataKey.RemeshTaskId,
  )
  let remeshTaskId = storedRemeshId
  if (!remeshTaskId) {
    const remeshBody = buildRemeshBody(payload)
    logger.info('Creating remesh task', { remeshBody })
    remeshTaskId = await createRemeshTask(apiKey, remeshBody)
    logger.info(`Meshy remesh task created: ${remeshTaskId}`)
    await metadata.set(RemeshMetadataKey.RemeshTaskId, remeshTaskId)
  }

  const result = await pollRemeshUntilDone(apiKey, remeshTaskId)
  logger.info('Meshy remesh SUCCEEDED - returning result immediately', { result })

  await persistRemeshResult(assetId, remeshTaskId, result)

  return {
    success: true,
    modelUrl: result.modelUrls?.glb,
    result,
  }
}

export const remesh3DModelTask = defineOwnedTask({
  id: 'remesh-3d-model',
  schema: remesh3dModelPayloadSchema,
  queue: JobQueue.Meshy,
  maxDuration: 1800, // 30 minutes
  retry: {
    maxAttempts: 3,
  },
  run: runRemesh3dModel,
})
