import type { BeatCard } from '@/domains/storyteller/core/types/story-types'
import { HttpMethod, QueryParam, ContentType } from '@/shared/data/constants/protocol'
import { fetchJsonRecord } from '@/shared/data/fetch-json-record'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import {
  readTriggerRunOutputField,
  type TriggerRunStatusPayload,
} from '@/shared/data/polling/trigger-run-polling'
import { buildUrl, joinUrlPath } from '@/shared/data/url-builder'

const BEAT_PROMPT_ROUTE = '/api/storyteller/beats/generate-prompt'
const BEAT_STATUS_ROUTE = '/api/storyteller/beats/status'

export async function fetchBeatImagePrompt(beat: BeatCard): Promise<string> {
  const data = await fetchJsonRecord(BEAT_PROMPT_ROUTE, {
    method: HttpMethod.Post,
    headers: { 'Content-Type': ContentType.Json },
    body: JSON.stringify({ beat }),
  })
  const prompt = readString(data.prompt)
  if (!prompt) {
    throw new Error('Missing prompt in beat image prompt response')
  }
  return prompt
}

export async function triggerBeatImageGeneration(
  beatId: string,
  input: {
    prompt: string
    config: Record<string, unknown>
  }
): Promise<{ handleId: string | null }> {
  const data = await fetchJsonRecord(joinUrlPath('/api/storyteller/beats', beatId, 'generate-image'), {
    method: HttpMethod.Post,
    headers: { 'Content-Type': ContentType.Json },
    body: JSON.stringify(input),
  })
  return { handleId: readString(data.handleId) ?? null }
}

export async function fetchBeatImageRunStatus(runId: string): Promise<TriggerRunStatusPayload> {
  const data = await fetchJsonRecord(buildUrl(BEAT_STATUS_ROUTE, { [QueryParam.RunId]: runId }))
  return {
    status: readString(data.status),
    output: recordFromJson(data.output),
    error: data.error,
  }
}

export function readBeatImageUrlFromRun(run: TriggerRunStatusPayload): string | null {
  return readTriggerRunOutputField(run, 'imageUrl')
}
