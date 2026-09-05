import { logger } from '@trigger.dev/sdk'
import {
  HttpAuthScheme,
  MeshyGenerationError,
  MeshyGenerationHttpHeader,
  MeshyGenerationLog,
  MeshyResponseField,
  MeshyTaskStatusValue,
  meshyImageTo3dStreamUrl,
} from '../constants/meshy-generation-wire'
import {
  meshyProgressPercent,
  parseMeshyTask,
  type MeshyTask,
} from '../constants/meshy-task-types'
import { appendMeshySseChunk, MeshySseEventName, parseMeshySseFrame } from './parse-meshy-sse'
import { readRowString, recordFromJson } from '@/shared/data/json-guards'

export enum MeshyStreamErrorName {
  Fallback = 'MeshyStreamFallbackError',
}

export class MeshyStreamFallbackError extends Error {
  constructor(message: string) {
    super(message)
    this.name = MeshyStreamErrorName.Fallback
  }
}

function meshyStreamErrorMessage(json: unknown, fallback: string): string {
  const record = recordFromJson(json)
  return readRowString(record, MeshyResponseField.Message) ?? fallback
}

async function handleMeshyStreamFrame(
  frame: string,
  onProgress: (progress: number) => Promise<void>,
  lastProgress: number | undefined,
): Promise<{ result: MeshyTask; lastProgress: number } | null> {
  const parsed = parseMeshySseFrame(frame)
  if (!parsed) return null

  if (parsed.event === MeshySseEventName.Error) {
    throw new Error(
      meshyStreamErrorMessage(parsed.json, MeshyGenerationError.FailedCheckStatus),
    )
  }

  const result = parseMeshyTask(parsed.json)
  const percent = meshyProgressPercent(result.progress, result.status)
  if (percent !== lastProgress) {
    logger.info(MeshyGenerationLog.MeshyProgress, {
      meshyId: result.id,
      meshyProgress: percent,
      status: result.status,
    })
    await onProgress(percent)
  }

  if (result.status === MeshyTaskStatusValue.Failed) {
    throw new Error(
      `Meshy 3D generation failed: ${result.error ?? result.message ?? MeshyGenerationError.Unknown}`,
    )
  }

  return { result, lastProgress: percent }
}

export async function streamMeshyImageTo3dTask(
  taskId: string,
  apiKey: string,
  onProgress: (progress: number) => Promise<void>,
): Promise<MeshyTask> {
  const response = await fetch(meshyImageTo3dStreamUrl(taskId), {
    headers: {
      [MeshyGenerationHttpHeader.Authorization]: `${HttpAuthScheme.Bearer}${apiKey}`,
    },
  })

  if (!response.ok || !response.body) {
    throw new MeshyStreamFallbackError(MeshyGenerationError.StreamUnavailable)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let lastResult: MeshyTask | null = null
  let lastProgress: number | undefined

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      const split = appendMeshySseChunk(buffer, decoder.decode(value, { stream: true }))
      buffer = split.rest
      for (const frame of split.frames) {
        const handled = await handleMeshyStreamFrame(frame, onProgress, lastProgress)
        if (!handled) continue
        lastResult = handled.result
        lastProgress = handled.lastProgress
        if (handled.result.status === MeshyTaskStatusValue.Succeeded) {
          return handled.result
        }
      }
    }
  } finally {
    try {
      await reader.cancel()
    } catch { }
  }

  if (lastResult?.status === MeshyTaskStatusValue.Succeeded) {
    return lastResult
  }

  throw new MeshyStreamFallbackError(MeshyGenerationError.StreamEnded)
}
