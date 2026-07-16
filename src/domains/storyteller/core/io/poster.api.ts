import { ContentType, HttpMethod, QueryParam } from '@/shared/data/constants/protocol'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import { buildUrl, joinUrlPath } from '@/shared/data/url-builder'
import type { TriggerRunStatusPayload } from '@/shared/data/polling/wait-for-trigger-run'

const POSTER_STATUS_ROUTE = '/api/storyteller/episodes/poster/status'

const JSON_HEADERS = { 'Content-Type': ContentType.Json }

async function fetchJson(input: RequestInfo | URL, init?: RequestInit): Promise<unknown> {
  const response = await fetch(input, init)

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response.json()
}

export async function triggerCombinedStoryboard(
  episodeId: string,
  input: { beats: Record<string, unknown>[]; config: Record<string, unknown> }
): Promise<{ handleId: string | null; error: string | null }> {
  const data = recordFromJson(
    await fetchJson(joinUrlPath('/api/storyteller/episodes', episodeId, 'generate-combined'), {
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

export async function triggerEpisodePoster(
  episodeId: string,
  input: { prompt: string; config: Record<string, unknown> }
): Promise<{ handleId: string | null; error: string | null }> {
  const data = recordFromJson(
    await fetchJson(joinUrlPath('/api/storyteller/episodes', episodeId, 'generate-poster'), {
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

export async function fetchPosterRunStatus(runId: string): Promise<TriggerRunStatusPayload> {
  const data = recordFromJson(await fetchJson(buildUrl(POSTER_STATUS_ROUTE, { [QueryParam.RunId]: runId })))
  return {
    status: readString(data.status),
    output: recordFromJson(data.output),
    error: data.error,
  }
}
