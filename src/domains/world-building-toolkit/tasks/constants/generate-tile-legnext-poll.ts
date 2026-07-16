import { logger, metadata } from '@trigger.dev/sdk/v3'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { LegNextJobStatus } from './generate-tile'
import { parseLegNextJob, readLegNextImageUrl, type LegNextJobResult } from './generate-tile-json-guards'

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
      const fetchResponse = await fetch(`https://api.legnext.ai/api/v1/job/${jobId}`, {
        method: 'GET',
        headers: { 'x-api-key': apiKey },
      })

      if (fetchResponse.status === 404) {
        throw new Error('LegNext task not found')
      }

      if (!fetchResponse.ok) {
        const errorText = await fetchResponse.text()
        logger.warn(`LegNext polling error: ${fetchResponse.status} - ${errorText}`)
        attempts++
        continue
      }

      const data = parseLegNextJob(await fetchResponse.json())
      const status = data.status

      let progress = 0
      if (status === LegNextJobStatus.Completed) progress = 100
      else if (status === LegNextJobStatus.Processing) progress = 50 + (attempts % 40)
      else if (status === LegNextJobStatus.Pending) progress = 10

      const scaledProgress = progressOffset + Math.round(progress * 0.65)
      await metadata.set('progress', scaledProgress)
      logger.info(`Polling job ${jobId}: Status = ${status}`, { attempt: attempts, scaledProgress })

      if (status === LegNextJobStatus.Completed) {
        logger.info('LegNext task completed successfully', {
          imageUrl: readLegNextImageUrl(data),
        })
        await metadata.set('progress', progressOffset + 65)
        return data
      }
      if (status === LegNextJobStatus.Failed) {
        const errorMsg = data.output?.error_messages?.join(', ') ?? data.message ?? 'Unknown error'
        logger.error('LegNext task failed', { error: errorMsg, fullData: data })
        throw new Error(errorMsg)
      }
    } catch (e: unknown) {
      logger.warn('Polling fetch error:', { error: getErrorMessage(e) })
      if (getErrorMessage(e)?.includes('not found')) throw e
    }

    attempts++
  }

  throw new Error('LegNext task timeout - Status did not reach completed')
}
