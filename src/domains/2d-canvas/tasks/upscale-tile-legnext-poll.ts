import { logger, metadata, AbortTaskRunError } from '@trigger.dev/sdk/v3'
import { getErrorMessage } from '@/shared/errors/error-utils'
import {
  readRowString,
  recordFromJson,
  stringArrayFromJson,
} from '@/shared/data/json-guards'
import { HttpMethod } from '@/shared/data/constants/protocol'
import { LegNextJobStatus } from '@/shared/ai/constants/legnext'

interface LegNextJobResponse {
  status?: string
  message?: string
  output?: {
    image_url?: string
    error_messages?: string[]
  }
}

function readLegNextJobResponse(value: unknown): LegNextJobResponse {
  const record = recordFromJson(value)
  const output = recordFromJson(record.output)
  return {
    status: readRowString(record, 'status'),
    message: readRowString(record, 'message'),
    output: {
      image_url: readRowString(output, 'image_url'),
      error_messages: stringArrayFromJson(output.error_messages),
    },
  }
}

function estimateLegNextProgress(status: string | undefined, attempts: number): number {
  if (status === LegNextJobStatus.Completed) return 100
  if (status === LegNextJobStatus.Processing) return 50 + (attempts % 40)
  if (status === LegNextJobStatus.Pending) return 10
  return 0
}

async function handleLegNextPollResponse(
  raw: unknown,
  jobId: string,
  attempts: number,
  progressOffset: number
): Promise<Record<string, unknown> | null> {
  const data = readLegNextJobResponse(raw)
  const status = data.status
  const progress = estimateLegNextProgress(status, attempts)
  const scaledProgress = progressOffset + Math.round(progress * 0.65)

  await metadata.set('progress', scaledProgress)
  logger.info(`Polling job ${jobId}: Status = ${status}`, { attempt: attempts, scaledProgress })

  if (status === LegNextJobStatus.Completed) {
    logger.info('LegNext task completed successfully', {
      imageUrl: data.output?.image_url,
    })
    await metadata.set('progress', progressOffset + 65)
    return recordFromJson(raw)
  }

  if (status === LegNextJobStatus.Failed) {
    const errorMsg =
      data.output?.error_messages?.join(', ') || data.message || 'Unknown error'
    logger.error('LegNext task failed', { error: errorMsg, fullData: data })
    throw new AbortTaskRunError(errorMsg)
  }

  return null
}

export async function pollLegNextTask(
  jobId: string,
  apiKey: string,
  maxAttempts: number = 300,
  progressOffset: number = 30
): Promise<Record<string, unknown>> {
  let attempts = 0

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000))

    try {
      const fetchResponse = await fetch(`https://api.legnext.ai/api/v1/job/${jobId}`, {
        method: HttpMethod.Get,
        headers: {
          'x-api-key': apiKey,
        },
      })

      if (fetchResponse.status === 404) {
        throw new AbortTaskRunError('Task not found')
      }

      if (!fetchResponse.ok) {
        const errorText = await fetchResponse.text()
        logger.warn(`LegNext polling error: ${fetchResponse.status} - ${errorText} `)
        attempts++
        continue
      }

      const raw = await fetchResponse.json()
      const completed = await handleLegNextPollResponse(raw, jobId, attempts, progressOffset)
      if (completed) return completed
    } catch (e: unknown) {
      if (e instanceof AbortTaskRunError) throw e
      logger.warn('Polling fetch error:', { error: getErrorMessage(e) })
    }

    attempts++
  }

  throw new AbortTaskRunError('Task timeout - Status did not reach completed')
}
