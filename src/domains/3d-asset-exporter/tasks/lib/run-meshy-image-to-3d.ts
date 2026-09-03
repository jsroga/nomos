import { logger, metadata } from '@trigger.dev/sdk'
import { MeshyTopology } from '@/shared/data/constants/protocol'
import { supabaseAdmin } from '@/shared/auth/supabase-admin'
import { readRowString, recordFromJson } from '@/shared/data/json-guards'
import {
  ContentType,
  DB_COLUMN,
  DB_TABLE,
  HttpAuthScheme,
  HttpMethod,
  MESHY_DEFAULT_POLYCOUNT,
  MESHY_GENERATION_DB_COLUMN_MODEL_FILENAME,
  MeshyAiModelId,
  MeshyGenerationApiUrl,
  MeshyGenerationError,
  MeshyGenerationErrorField,
  MeshyGenerationHttpHeader,
  MeshyGenerationLog,
  MeshyGenerationMetadataKey,
  MeshyGenerationRequestField,
  MeshyResponseField,
} from '../constants/meshy-generation-wire'
import {
  resolveMeshyModelUrl,
  type MeshyTask,
} from '../constants/meshy-task-types'
import { pollMeshyImageTo3dTask } from './poll-meshy-image-to-3d'
import { MeshyStreamFallbackError, streamMeshyImageTo3dTask } from './stream-meshy-image-to-3d'

interface RunMeshyImageTo3dParams {
  assetId: string
  finalImageUrl: string
  apiKey: string
  targetPolycount?: number
  topology?: MeshyTopology
  onProgress?: (progress: number) => Promise<void>
}

const MESHY_PROGRESS_COMPLETE = 100

async function reportMeshyProgress(
  onProgress: ((progress: number) => Promise<void>) | undefined,
  progress: number,
): Promise<void> {
  if (onProgress) {
    await onProgress(progress)
    return
  }
  await metadata.set(MeshyGenerationMetadataKey.Progress, progress)
}

function parseMeshyErrorMessage(errText: string, fallback: string): string {
  try {
    const errJson = recordFromJson(JSON.parse(errText))
    return (
      readRowString(errJson, MeshyResponseField.Message) ??
      readRowString(errJson, MeshyGenerationErrorField.Error) ??
      fallback
    )
  } catch {
    return fallback
  }
}

async function persistMeshyModelUrl(assetId: string, result: MeshyTask): Promise<void> {
  const modelUrl = resolveMeshyModelUrl(result)
  try {
    await supabaseAdmin
      .from(DB_TABLE.ASSETS)
      .update({ [MESHY_GENERATION_DB_COLUMN_MODEL_FILENAME]: modelUrl })
      .eq(DB_COLUMN.ID, assetId)
  } catch (dbErr) {
    logger.error(MeshyGenerationLog.DbUpdateFailed, { dbErr })
    throw dbErr
  }
}

function readStoredMeshyTaskId(): string | undefined {
  return readRowString(recordFromJson(metadata.current()), MeshyGenerationMetadataKey.MeshyTaskId)
}

async function awaitMeshyImageTo3dTask(
  taskId: string,
  apiKey: string,
  onProgress: (progress: number) => Promise<void>,
): Promise<MeshyTask> {
  try {
    return await streamMeshyImageTo3dTask(taskId, apiKey, onProgress)
  } catch (error) {
    if (!(error instanceof MeshyStreamFallbackError)) throw error
    logger.warn(MeshyGenerationLog.MeshyStreamFallback)
    return pollMeshyImageTo3dTask(taskId, apiKey, onProgress)
  }
}

export async function runMeshyImageTo3d(params: RunMeshyImageTo3dParams) {
  const { assetId, finalImageUrl, apiKey, targetPolycount, topology, onProgress } = params

  logger.info(MeshyGenerationLog.StartingMeshy)

  const shouldRemesh =
    targetPolycount !== undefined && targetPolycount !== MESHY_DEFAULT_POLYCOUNT

  const storedTaskId = readStoredMeshyTaskId()
  let taskId = storedTaskId
  if (!taskId) {
    const createResponse = await fetch(MeshyGenerationApiUrl.OpenApiImageTo3d, {
      method: HttpMethod.Post,
      headers: {
        [MeshyGenerationHttpHeader.Authorization]: `${HttpAuthScheme.Bearer}${apiKey}`,
        [MeshyGenerationHttpHeader.ContentType]: ContentType.Json,
      },
      body: JSON.stringify({
        [MeshyGenerationRequestField.ImageUrl]: finalImageUrl,
        [MeshyGenerationRequestField.AiModel]: MeshyAiModelId.Latest,
        [MeshyGenerationRequestField.EnablePbr]: true,
        [MeshyGenerationRequestField.Topology]: topology ?? MeshyTopology.Triangle,
        [MeshyGenerationRequestField.TargetPolycount]: targetPolycount ?? MESHY_DEFAULT_POLYCOUNT,
        [MeshyGenerationRequestField.ShouldRemesh]: shouldRemesh,
      }),
    })

    if (!createResponse.ok) {
      const errText = await createResponse.text()
      logger.error(MeshyGenerationLog.MeshyApiError, { status: createResponse.status, body: errText })
      throw new Error(
        `Meshy API error: ${parseMeshyErrorMessage(errText, createResponse.statusText)}`,
      )
    }

    const createJson = recordFromJson(await createResponse.json())
    taskId = readRowString(createJson, MeshyResponseField.Result)
    if (!taskId) {
      throw new Error(MeshyGenerationError.NoTaskId)
    }

    logger.info(`Meshy task created: ${taskId}`, { topology, targetPolycount, shouldRemesh })
    await metadata.set(MeshyGenerationMetadataKey.MeshyTaskId, taskId)
  }

  const result = await awaitMeshyImageTo3dTask(taskId, apiKey, progress =>
    reportMeshyProgress(onProgress, progress),
  )

  logger.info(MeshyGenerationLog.MeshySucceeded, { result })
  await reportMeshyProgress(onProgress, MESHY_PROGRESS_COMPLETE)
  await persistMeshyModelUrl(assetId, result)

  return {
    success: true,
    modelUrl: resolveMeshyModelUrl(result),
    result,
  }
}
