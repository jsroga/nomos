import { logger } from '@trigger.dev/sdk/v3'
import { supabaseAdmin } from '@/shared/auth/supabase-admin'
import { readRowString, recordFromJson } from '@/shared/data/json-guards'
import { buildUrl } from '@/shared/data/url-builder'
import {
  ContentType,
  DB_COLUMN,
  DB_TABLE,
  Hyper3dGenerationApiUrl,
  Hyper3dResponseField,
  Hyper3dTaskStatus,
  HttpAuthScheme,
  HttpMethod,
  JsonImageUrlType,
  MESHY_GENERATION_DB_COLUMN_MODEL_FILENAME,
  MeshyGenerationError,
  MeshyGenerationHttpHeader,
  MeshyGenerationLog,
  MeshyResponseField,
  HYPER3D_MAX_POLL_ATTEMPTS,
  HYPER3D_POLL_INTERVAL_MS,
  UrlScheme,
} from '../constants/meshy-generation-wire'
import {
  parseHyper3dTaskResult,
  resolveHyper3dModelUrl,
  type Hyper3dTaskResult,
} from '../constants/meshy-task-types'

interface RunHyper3dGenerationParams {
  assetId: string
  finalImageUrl: string
  apiKey: string
}

function parseHyper3dErrorMessage(json: unknown, fallback: string): string {
  const record = recordFromJson(json)
  return readRowString(record, MeshyResponseField.Message) ?? fallback
}

async function pollHyper3dTask(
  subscriptionKey: string,
  apiKey: string,
): Promise<Hyper3dTaskResult> {
  let status: string = Hyper3dTaskStatus.Processing
  let result: Hyper3dTaskResult | null = null
  let attempts = 0

  while (status === Hyper3dTaskStatus.Processing && attempts < HYPER3D_MAX_POLL_ATTEMPTS) {
    await new Promise(resolve => setTimeout(resolve, HYPER3D_POLL_INTERVAL_MS))

    const statusResponse = await fetch(
      buildUrl(Hyper3dGenerationApiUrl.RodinStatus, { [Hyper3dResponseField.SubscriptionKey]: subscriptionKey }),
      {
        headers: {
          [MeshyGenerationHttpHeader.Authorization]: `${HttpAuthScheme.Bearer}${apiKey}`,
        },
      },
    )

    if (!statusResponse.ok) {
      throw new Error(MeshyGenerationError.FailedCheckHyper3d)
    }

    result = parseHyper3dTaskResult(await statusResponse.json())
    status = result.status
    attempts++

    logger.info(`Hyper3D status: ${status} (attempt ${attempts}/${HYPER3D_MAX_POLL_ATTEMPTS})`)
  }

  if (status === Hyper3dTaskStatus.Failed) {
    const errorDetails = result?.error ?? result?.message ?? MeshyGenerationError.Unknown
    throw new Error(`Hyper3D generation failed: ${errorDetails}`)
  }

  if (status !== Hyper3dTaskStatus.Completed) {
    throw new Error(`Hyper3D generation timed out after 15 minutes. Last status: ${status}`)
  }

  if (!result) {
    throw new Error(MeshyGenerationError.Hyper3dNoResult)
  }

  return result
}

export async function runHyper3dGeneration(params: RunHyper3dGenerationParams) {
  const { assetId, finalImageUrl, apiKey } = params

  logger.info(MeshyGenerationLog.StartingHyper3d)

  const response = await fetch(Hyper3dGenerationApiUrl.Rodin, {
    method: HttpMethod.Post,
    headers: {
      [MeshyGenerationHttpHeader.Authorization]: `${HttpAuthScheme.Bearer}${apiKey}`,
      [MeshyGenerationHttpHeader.ContentType]: ContentType.Json,
    },
    body: JSON.stringify({
      images: [
        {
          type: finalImageUrl.startsWith(UrlScheme.Data)
            ? JsonImageUrlType.Base64
            : JsonImageUrlType.Url,
          url: finalImageUrl,
        },
      ],
    }),
  })

  if (!response.ok) {
    const errJson = await response.json()
    throw new Error(
      `Hyper3D API error: ${parseHyper3dErrorMessage(errJson, response.statusText)}`,
    )
  }

  const responseJson = recordFromJson(await response.json())
  const subscriptionKey = readRowString(responseJson, Hyper3dResponseField.SubscriptionKey)
  if (!subscriptionKey) {
    throw new Error(MeshyGenerationError.NoSubscriptionKey)
  }

  logger.info(`${MeshyGenerationLog.Hyper3dSubscriptionKey} ${subscriptionKey}`)

  const result = await pollHyper3dTask(subscriptionKey, apiKey)
  const modelUrl = resolveHyper3dModelUrl(result) ?? ''

  const { error } = await supabaseAdmin
    .from(DB_TABLE.ASSETS)
    .update({ [MESHY_GENERATION_DB_COLUMN_MODEL_FILENAME]: modelUrl })
    .eq(DB_COLUMN.ID, assetId)

  if (error) {
    logger.error(MeshyGenerationLog.FailedDbUpdate, { error })
    throw error
  }

  logger.info(MeshyGenerationLog.ModelGenerated, { modelUrl })

  return {
    success: true,
    modelUrl,
    result,
  }
}
