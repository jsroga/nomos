import { logger } from '@trigger.dev/sdk'
import {
  HttpAuthScheme,
  MESHY_MAX_POLL_ATTEMPTS,
  MESHY_POLL_INTERVAL_MS,
  MeshyGenerationError,
  MeshyGenerationHttpHeader,
  MeshyGenerationLog,
  MeshyTaskStatusValue,
  meshyImageTo3dTaskUrl,
} from '../constants/meshy-generation-wire'
import {
  meshyProgressPercent,
  parseMeshyTask,
  type MeshyTask,
} from '../constants/meshy-task-types'

export async function pollMeshyImageTo3dTask(
  taskId: string,
  apiKey: string,
  onProgress: (progress: number) => Promise<void>,
): Promise<MeshyTask> {
  let status: string = MeshyTaskStatusValue.Pending
  let result: MeshyTask | null = null
  let lastLoggedProgress: number | undefined

  for (let attempts = 0; attempts < MESHY_MAX_POLL_ATTEMPTS; attempts++) {
    if (attempts > 0) {
      await new Promise(resolve => setTimeout(resolve, MESHY_POLL_INTERVAL_MS))
    }

    const statusResponse = await fetch(meshyImageTo3dTaskUrl(taskId), {
      headers: {
        [MeshyGenerationHttpHeader.Authorization]: `${HttpAuthScheme.Bearer}${apiKey}`,
      },
    })

    if (!statusResponse.ok) {
      logger.error(MeshyGenerationLog.StatusCheckFailed, { status: statusResponse.status })
      throw new Error(MeshyGenerationError.FailedCheckStatus)
    }

    result = parseMeshyTask(await statusResponse.json())
    status = result.status
    const percent = meshyProgressPercent(result.progress, status)

    if (percent !== lastLoggedProgress) {
      lastLoggedProgress = percent
      logger.info(MeshyGenerationLog.MeshyProgress, {
        taskId,
        meshyId: result.id,
        status,
        meshyProgress: percent,
        pollAttempt: attempts + 1,
      })
    }

    await onProgress(percent)

    if (status === MeshyTaskStatusValue.Succeeded) {
      return result
    }

    if (status === MeshyTaskStatusValue.Failed) {
      throw new Error(
        `Meshy 3D generation failed: ${result.error ?? result.message ?? MeshyGenerationError.Unknown}`,
      )
    }
  }

  throw new Error(
    `Meshy 3D generation timed out after 30 minutes. Last status: ${status}, Progress: ${meshyProgressPercent(result?.progress, status)}%`,
  )
}
