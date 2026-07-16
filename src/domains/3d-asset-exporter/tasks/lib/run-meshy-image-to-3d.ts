import { logger, metadata } from '@trigger.dev/sdk/v3'
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
  MESHY_MAX_POLL_ATTEMPTS,
  MESHY_POLL_INTERVAL_MS,
  MeshyAiModelId,
  MeshyGenerationApiUrl,
  MeshyGenerationError,
  MeshyGenerationErrorField,
  MeshyGenerationHttpHeader,
  MeshyGenerationLog,
  MeshyGenerationMetadataKey,
  MeshyGenerationRequestField,
  MeshyGenerationTopology,
  MeshyResponseField,
  MeshyTaskStatusValue,
} from '../constants/meshy-generation-wire'
import {
  parseMeshyTaskResult,
  resolveMeshyModelUrl,
  type MeshyTaskResult,
} from '../constants/meshy-task-types'

interface RunMeshyImageTo3dParams {
  assetId: string
  finalImageUrl: string
  apiKey: string
  targetPolycount?: number
  topology?: MeshyGenerationTopology
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

async function pollMeshyImageTo3dTask(
  taskId: string,
  apiKey: string,
  assetId: string,
): Promise<MeshyTaskResult> {
  let status: string = MeshyTaskStatusValue.Pending
  let result: MeshyTaskResult | null = null

  for (let attempts = 0; attempts < MESHY_MAX_POLL_ATTEMPTS; attempts++) {
    await new Promise(resolve => setTimeout(resolve, MESHY_POLL_INTERVAL_MS))

    const statusResponse = await fetch(`${MeshyGenerationApiUrl.OpenApiImageTo3d}/${taskId}`, {
      headers: {
        [MeshyGenerationHttpHeader.Authorization]: `${HttpAuthScheme.Bearer}${apiKey}`,
      },
    })

    if (!statusResponse.ok) {
      logger.error(MeshyGenerationLog.StatusCheckFailed, { status: statusResponse.status })
      throw new Error(MeshyGenerationError.FailedCheckStatus)
    }

    result = parseMeshyTaskResult(await statusResponse.json())
    status = result.status

    await metadata.set(MeshyGenerationMetadataKey.Progress, result.progress ?? 0)

    logger.info(
      `Meshy status: ${status}, Progress: ${result.progress ?? 0}% (attempt ${attempts + 1}/${MESHY_MAX_POLL_ATTEMPTS})`,
      { result },
    )

    if (status === MeshyTaskStatusValue.Succeeded) {
      logger.info(MeshyGenerationLog.MeshySucceeded, { result })

      const modelUrl = resolveMeshyModelUrl(result)
      try {
        await supabaseAdmin
          .from(DB_TABLE.ASSETS)
          .update({ [MESHY_GENERATION_DB_COLUMN_MODEL_FILENAME]: modelUrl })
          .eq(DB_COLUMN.ID, assetId)
      } catch (dbErr) {
        logger.error(MeshyGenerationLog.DbUpdateFailed, { dbErr })
      }

      return result
    }

    if (status === MeshyTaskStatusValue.Failed) {
      throw new Error(
        `Meshy 3D generation failed: ${result.error ?? result.message ?? MeshyGenerationError.Unknown}`,
      )
    }
  }

  throw new Error(
    `Meshy 3D generation timed out after 30 minutes. Last status: ${status}, Progress: ${result?.progress ?? 0}%`,
  )
}

export async function runMeshyImageTo3d(params: RunMeshyImageTo3dParams) {
  const { assetId, finalImageUrl, apiKey, targetPolycount, topology } = params

  logger.info(MeshyGenerationLog.StartingMeshy)

  const shouldRemesh =
    targetPolycount !== undefined && targetPolycount !== MESHY_DEFAULT_POLYCOUNT

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
      [MeshyGenerationRequestField.Topology]: topology ?? MeshyGenerationTopology.Triangle,
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
  const taskId = readRowString(createJson, MeshyResponseField.Result)
  if (!taskId) {
    throw new Error(MeshyGenerationError.NoTaskId)
  }

  logger.info(`Meshy task created: ${taskId}`, { topology, targetPolycount, shouldRemesh })
  await metadata.set(MeshyGenerationMetadataKey.MeshyTaskId, taskId)

  const result = await pollMeshyImageTo3dTask(taskId, apiKey, assetId)

  return {
    success: true,
    modelUrl: resolveMeshyModelUrl(result),
    result,
  }
}
