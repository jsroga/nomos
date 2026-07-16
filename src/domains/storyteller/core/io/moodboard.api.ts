import { ContentType, HttpMethod, QueryParam } from '@/shared/data/constants/protocol'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import { buildUrl } from '@/shared/data/url-builder'
import type { TriggerRunStatusPayload } from '@/shared/data/polling/wait-for-trigger-run'

const MOODBOARD_TRIGGER_ROUTE = '/api/storyteller/moodboard/trigger'
const MOODBOARD_STATUS_ROUTE = '/api/storyteller/moodboard/status'

const JSON_HEADERS = { 'Content-Type': ContentType.Json }

async function fetchJson(input: RequestInfo | URL, init?: RequestInit): Promise<unknown> {
  const response = await fetch(input, init)

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response.json()
}

export async function triggerMoodboardGeneration(input: {
  projectId: string
  prompts: string[]
  styleReference?: string
  providerConfig: Record<string, unknown>
  promptIndex?: number
}): Promise<{ handleId: string | null; error: string | null }> {
  const data = recordFromJson(
    await fetchJson(MOODBOARD_TRIGGER_ROUTE, {
      method: HttpMethod.Post,
      headers: JSON_HEADERS,
      body: JSON.stringify(input),
    })
  )
  return {
    handleId: readString(data.handleId) ?? null,
    error: readString(data.error) ?? null,
  }
}

export async function fetchMoodboardRunStatus(
  runId: string
): Promise<TriggerRunStatusPayload & { metadata?: Record<string, unknown> }> {
  const data = recordFromJson(await fetchJson(buildUrl(MOODBOARD_STATUS_ROUTE, { [QueryParam.RunId]: runId })))
  return {
    status: readString(data.status),
    output: recordFromJson(data.output),
    error: data.error,
    metadata: recordFromJson(data.metadata),
  }
}
