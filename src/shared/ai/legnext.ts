import { ContentType, HttpMethod } from '@/shared/data/constants/protocol'
import {
  LEGNEXT_ERROR_SEPARATOR,
  LEGNEXT_UNKNOWN_ERROR,
  LegNextErrorMessage,
  LegNextJobStatus,
} from '@/shared/ai/constants/legnext'

export async function submitImagineTask(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.legnext.ai/api/v1/diffusion', {
    method: HttpMethod.Post,
    headers: {
      'x-api-key': apiKey,
      'Content-Type': ContentType.Json,
    },
    body: JSON.stringify({
      text: prompt,
    }),
  })

  // LegNext returns { job_id: "..." } directly on success
  const data = await response.json()

  if (!response.ok) {
    throw new Error(`LegNext imagine failed: ${response.status} - ${JSON.stringify(data)}`)
  }

  if (!data.job_id) {
    throw new Error(`LegNext imagine failed: No job_id returned - ${JSON.stringify(data)}`)
  }

  return data.job_id
}

export async function pollLegNextTask(
  jobId: string,
  apiKey: string,
  maxAttempts = 60,
  intervalMs = 2000
): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`https://api.legnext.ai/api/v1/job/${jobId}`, {
      method: HttpMethod.Get,
      headers: {
        'x-api-key': apiKey,
      },
    })

    if (!response.ok) {
      throw new Error(`LegNext polling failed: ${response.status} - ${await response.text()}`)
    }

    const data = await response.json()
    // Status values: pending, staged, processing, failed, completed
    if (data.status === LegNextJobStatus.Completed) {
      return data.output
    }

    if (data.status === LegNextJobStatus.Failed) {
      const errorMsg = data.output?.error_messages?.join(LEGNEXT_ERROR_SEPARATOR) || data.message || LEGNEXT_UNKNOWN_ERROR
      throw new Error(`LegNext task failed: ${errorMsg}`)
    }

    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }

  throw new Error(LegNextErrorMessage.TaskTimedOut)
}
