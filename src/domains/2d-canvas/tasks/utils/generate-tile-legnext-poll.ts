import { logger, metadata } from '@trigger.dev/sdk'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { LegNextJobStatus } from '@/shared/ai/constants/legnext'
import { HttpMethod } from '@/shared/data/constants/protocol'
import { parseLegNextJob, readLegNextImageUrl, type LegNextJobResult } from './generate-tile-json-guards'

type PollOutcome =
  | { kind: 'completed'; data: LegNextJobResult }
  | { kind: 'failed'; error: string }
  | { kind: 'continue'; progress: number }

function legNextProgressForStatus(status: string, attempts: number): number {
  if (status === LegNextJobStatus.Completed) return 100
  if (status === LegNextJobStatus.Processing) return 50 + (attempts % 40)
  if (status === LegNextJobStatus.Pending) return 10
  return 0
}

async function pollLegNextOnce(
  jobId: string,
  apiKey: string,
  attempts: number
): Promise<PollOutcome> {
  const fetchResponse = await fetch(`https://api.legnext.ai/api/v1/job/${jobId}`, {
    method: HttpMethod.Get,
    headers: { 'x-api-key': apiKey },
  })

  if (fetchResponse.status === 404) {
    throw new Error('LegNext task not found')
  }

  if (!fetchResponse.ok) {
    const errorText = await fetchResponse.text()
    logger.warn(`LegNext polling error: ${fetchResponse.status} - ${errorText}`)
    return { kind: 'continue', progress: 0 }
  }

  const data = parseLegNextJob(await fetchResponse.json())
  const status = data.status
  const progress = legNextProgressForStatus(status, attempts)

  logger.info(`Polling job ${jobId}: Status = ${status}`, { attempt: attempts, progress })

  if (status === LegNextJobStatus.Completed) {
    logger.info('LegNext task completed successfully', { imageUrl: readLegNextImageUrl(data) })
    return { kind: 'completed', data }
  }

  if (status === LegNextJobStatus.Failed) {
    const errorMsg = data.output?.error_messages?.join(', ') ?? data.message ?? 'Unknown error'
    logger.error('LegNext task failed', { error: errorMsg, fullData: data })
    return { kind: 'failed', error: errorMsg }
  }

  return { kind: 'continue', progress }
}

export async function pollLegNextTask(
  jobId: string,
  apiKey: string,
  maxAttempts: number = 300,
  progressOffset: number = 30
): Promise<LegNextJobResult> {
  let attempts = 0

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000))

    try {
      const outcome = await pollLegNextOnce(jobId, apiKey, attempts)

      if (outcome.kind === 'completed') {
        await metadata.set('progress', progressOffset + 65)
        return outcome.data
      }
      if (outcome.kind === 'failed') {
        throw new Error(outcome.error)
      }

      const scaledProgress = progressOffset + Math.round(outcome.progress * 0.65)
      await metadata.set('progress', scaledProgress)
    } catch (e: unknown) {
      logger.warn('Polling fetch error:', { error: getErrorMessage(e) })
      if (getErrorMessage(e)?.includes('not found')) throw e
    }

    attempts++
  }

  throw new Error('LegNext task timeout - Status did not reach completed')
}
