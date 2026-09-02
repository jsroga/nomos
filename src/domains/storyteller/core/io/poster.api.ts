import { API_ERROR, TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { withSubmissionNonce } from '@/shared/jobs/submission-nonce'
import { ContentType, HttpMethod, QueryParam } from '@/shared/data/constants/protocol'
import { TRIGGER_STATUS_FETCH_INIT } from '@/shared/data/constants/polling'
import { fetchJson } from '@/shared/data/fetch-json-record'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import { buildUrl, joinUrlPath } from '@/shared/data/url-builder'
import type { TriggerRunStatusPayload } from '@/shared/data/polling/wait-for-trigger-run'
import type { ApiframeVideoModel } from '@/shared/ai/constants/apiframe'
import {
  StoryboardVideoLook,
  StoryboardVideoRequestField,
} from '@/shared/ai/storyboard-video-env'

const POSTER_STATUS_ROUTE = '/api/storyteller/episodes/poster/status'
const GENERATE_COMBINED_SEGMENT = 'generate-combined'
const GENERATE_POSTER_SEGMENT = 'generate-poster'

const JSON_HEADERS = { 'Content-Type': ContentType.Json }

export async function triggerCombinedStoryboard(
  episodeId: string,
  model?: ApiframeVideoModel,
  look?: StoryboardVideoLook,
): Promise<{ handleId: string | null; error: string | null }> {
  const body: Record<string, unknown> = {}
  if (model) body[StoryboardVideoRequestField.Model] = model
  if (look) body[StoryboardVideoRequestField.Look] = look
  const data = recordFromJson(
    await withSubmissionNonce(
      `${TRIGGER_TASK_ID.GENERATE_COMBINED_STORYBOARD}:${episodeId}`,
      requestId =>
        fetchJson(
          joinUrlPath('/api/storyteller/episodes', episodeId, GENERATE_COMBINED_SEGMENT),
          {
            method: HttpMethod.Post,
            headers: JSON_HEADERS,
            body: JSON.stringify({ ...body, requestId }),
          }
        )
    )
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
  const response = await withSubmissionNonce(
    `${TRIGGER_TASK_ID.GENERATE_POSTER}:${episodeId}:${input.prompt}`,
    requestId =>
      fetch(joinUrlPath('/api/storyteller/episodes', episodeId, GENERATE_POSTER_SEGMENT), {
        method: HttpMethod.Post,
        headers: JSON_HEADERS,
        body: JSON.stringify({ ...input, requestId }),
      })
  )
  const data = recordFromJson(await response.json().catch(() => ({})))
  if (!response.ok) {
    return {
      handleId: null,
      error: readString(data.error) ?? API_ERROR.INTERNAL_ERROR,
    }
  }
  return {
    handleId: readString(data.handleId) ?? null,
    error: readString(data.error) ?? null,
  }
}

export async function fetchPosterRunStatus(runId: string): Promise<TriggerRunStatusPayload> {
  const data = recordFromJson(
    await fetchJson(buildUrl(POSTER_STATUS_ROUTE, { [QueryParam.RunId]: runId }), TRIGGER_STATUS_FETCH_INIT),
  )
  return {
    status: readString(data.status),
    output: recordFromJson(data.output),
    error: data.error,
  }
}
