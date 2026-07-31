import { task, logger, metadata } from '@trigger.dev/sdk/v3'
import { supabaseAdmin } from '@/shared/auth/supabase-admin'
import { recordFromJson } from '@/shared/data/json-guards'
import { ContentType, HttpMethod } from '@/shared/data/constants/protocol'
import {
  MeshyTaskStatusValue,
  parseMeshyTaskResult,
  type MeshyTaskResult,
} from './constants/meshy-task-types'

interface RemeshRunPayload {
  assetId: string
  meshyTaskId: string
  apiKey: string
  topology: 'quad' | 'triangle'
  targetPolycount: number
  resizeHeight?: number
}

function buildRemeshBody(payload: RemeshRunPayload): Record<string, unknown> {
  const body: Record<string, unknown> = {
    input_task_id: payload.meshyTaskId,
    target_formats: ['glb', 'fbx', 'obj', 'usdz'],
    topology: payload.topology,
    target_polycount: payload.targetPolycount,
    origin_at: 'bottom',
  }
  if (payload.resizeHeight && payload.resizeHeight > 0) {
    body.resize_height = payload.resizeHeight
  }
  return body
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

async function fetchRemeshStatus(apiKey: string, remeshTaskId: string): Promise<MeshyTaskResult> {
  const statusResponse = await fetch(`https://api.meshy.ai/openapi/v1/remesh/${remeshTaskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (!statusResponse.ok) {
    logger.error('Remesh status check failed:', { status: statusResponse.status })
    throw new Error('Failed to check remesh task status')
  }

  return parseMeshyTaskResult(await statusResponse.json())
}

async function pollRemeshUntilDone(apiKey: string, remeshTaskId: string): Promise<MeshyTaskResult> {
  const maxAttempts = 120
  let lastStatus: string = MeshyTaskStatusValue.Pending
  let lastResult: MeshyTaskResult | null = null

  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    await new Promise(resolve => setTimeout(resolve, 15000))
    lastResult = await fetchRemeshStatus(apiKey, remeshTaskId)
    lastStatus = lastResult.status

    const progress = lastResult.progress ?? 0
    await metadata.set('progress', progress)
    logger.info(
      `Meshy remesh status: ${lastStatus}, Progress: ${progress}% (attempt ${attempts + 1}/${maxAttempts})`,
      { result: lastResult },
    )

    if (lastStatus === MeshyTaskStatusValue.Succeeded) {
      return lastResult
    }
    if (lastStatus === MeshyTaskStatusValue.Failed) {
      throw new Error(`Meshy remesh failed: ${lastResult.task_error?.message ?? 'Unknown error'}`)
    }
  }

  throw new Error(
    `Meshy remesh timed out after 30 minutes. Last status: ${lastStatus}, Progress: ${lastResult?.progress ?? 0}%`,
  )
}

async function persistRemeshResult(
  assetId: string,
  remeshTaskId: string,
  result: MeshyTaskResult,
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
  }
}

export const remesh3DModelTask = task({
  id: 'remesh-3d-model',
  maxDuration: 1800, // 30 minutes
  retry: {
    maxAttempts: 1, // Don't retry - costs money
  },
  run: async (payload: RemeshRunPayload) => {
    const { assetId, meshyTaskId, apiKey } = payload

    logger.info(`Remeshing 3D model for asset ${assetId}, original task: ${meshyTaskId}`)

    await metadata.set('progress', 0)
    await metadata.set('meshy_task_id', meshyTaskId)

    const remeshBody = buildRemeshBody(payload)
    logger.info('Creating remesh task', { remeshBody })

    const remeshTaskId = await createRemeshTask(apiKey, remeshBody)
    logger.info(`Meshy remesh task created: ${remeshTaskId}`)
    await metadata.set('remesh_task_id', remeshTaskId)

    const result = await pollRemeshUntilDone(apiKey, remeshTaskId)
    logger.info('Meshy remesh SUCCEEDED - returning result immediately', { result })

    await persistRemeshResult(assetId, remeshTaskId, result)

    return {
      success: true,
      modelUrl: result.model_urls?.glb,
      result,
    }
  },
})
