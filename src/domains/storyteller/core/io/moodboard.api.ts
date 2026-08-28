import { TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { withSubmissionNonce } from '@/shared/jobs/submission-nonce'
import { ContentType, HttpMethod, QueryParam } from '@/shared/data/constants/protocol'
import { TRIGGER_STATUS_FETCH_INIT } from '@/shared/data/constants/polling'
import { fetchJson, fetchJsonRecord } from '@/shared/data/fetch-json-record'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import { buildUrl } from '@/shared/data/url-builder'
import type { TriggerRunStatusPayload } from '@/shared/data/polling/wait-for-trigger-run'

const MOODBOARD_TRIGGER_ROUTE = '/api/storyteller/moodboard/trigger'
const MOODBOARD_STATUS_ROUTE = '/api/storyteller/moodboard/status'
const SETTINGS_PROVIDERS_ENDPOINT = '/api/settings/providers'

const JSON_HEADERS = { 'Content-Type': ContentType.Json }

export async function triggerMoodboardGeneration(input: {
  projectId: string
  prompts: string[]
  providerConfig: Record<string, unknown>
  promptIndex?: number
}): Promise<{ handleId: string | null; error: string | null }> {
  const data = recordFromJson(
    await withSubmissionNonce(
      `${TRIGGER_TASK_ID.GENERATE_MOODBOARD}:${input.projectId}:${input.promptIndex ?? ''}`,
      requestId =>
        fetchJson(MOODBOARD_TRIGGER_ROUTE, {
          method: HttpMethod.Post,
          headers: JSON_HEADERS,
          body: JSON.stringify({ ...input, requestId }),
        })
    )
  )
  return {
    handleId: readString(data.handleId) ?? null,
    error: readString(data.error) ?? null,
  }
}

export async function fetchMoodboardRunStatus(
  runId: string
): Promise<TriggerRunStatusPayload & { metadata?: Record<string, unknown> }> {
  const data = recordFromJson(
    await fetchJson(buildUrl(MOODBOARD_STATUS_ROUTE, { [QueryParam.RunId]: runId }), TRIGGER_STATUS_FETCH_INIT),
  )
  return {
    status: readString(data.status),
    output: recordFromJson(data.output),
    error: data.error,
    metadata: recordFromJson(data.metadata),
  }
}

export async function fetchLegnextServerConfigured(): Promise<boolean> {
  const data = await fetchJsonRecord(SETTINGS_PROVIDERS_ENDPOINT)
  const providers = recordFromJson(data.providers)
  return providers.apiframe === true || providers.legnext === true
}
