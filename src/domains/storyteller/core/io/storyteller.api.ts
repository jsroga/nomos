import { ContentType, HttpMethod, QueryParam } from '@/shared/data/constants/protocol'
import { fetchJsonRecord } from '@/shared/data/fetch-json-record'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import { buildUrl, joinUrlPath } from '@/shared/data/url-builder'

import {
  storytellerBibleLockQuerySchema,
  storytellerBibleLockResponseSchema,
  storytellerCreateEpisodeRequestSchema,
  storytellerEpisodeResponseSchema,
  storytellerEpisodesQuerySchema,
  storytellerEpisodesResponseSchema,
  type StorytellerBibleLockResponse,
  type StorytellerEpisodeListItem,
  type StorytellerEpisodeResponse,
} from './storyteller.dto'

const JSON_HEADERS = { 'Content-Type': ContentType.Json }

async function fetchJson(input: RequestInfo | URL, init?: RequestInit): Promise<unknown> {
  const response = await fetch(input, init)

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response.json()
}

async function fetchAndParse<T>(input: RequestInfo | URL, schema: { parse: (value: unknown) => T }) {
  return schema.parse(await fetchJson(input))
}

export async function fetchStorytellerEpisodes(
  rawProjectId: string
): Promise<StorytellerEpisodeListItem[]> {
  const { projectId } = storytellerEpisodesQuerySchema.parse({ projectId: rawProjectId })
  return fetchAndParse(
    buildUrl('/api/storyteller/episodes', { [QueryParam.ProjectId]: projectId }),
    storytellerEpisodesResponseSchema
  )
}

export async function fetchStorytellerEpisode(
  episodeId: string
): Promise<StorytellerEpisodeResponse & { episode_prompt?: string | null }> {
  const episode = await fetchAndParse(
    joinUrlPath('/api/storyteller/episodes', episodeId),
    storytellerEpisodeResponseSchema
  )

  return {
    ...episode,
    episode_prompt: episode.masterPrompt ?? null,
  }
}

export async function fetchStorytellerBibleLock(
  rawProjectId: string
): Promise<StorytellerBibleLockResponse> {
  const { projectId } = storytellerBibleLockQuerySchema.parse({ projectId: rawProjectId })
  return fetchAndParse(
    buildUrl('/api/storyteller/bible/lock', { [QueryParam.ProjectId]: projectId }),
    storytellerBibleLockResponseSchema
  )
}

export async function fetchStorytellerBibleLockOptional(
  rawProjectId: string
): Promise<StorytellerBibleLockResponse> {
  try {
    return await fetchStorytellerBibleLock(rawProjectId)
  } catch {
    return { isLocked: false, lockedBy: null, lockedAt: null }
  }
}

export async function postStorytellerBibleLock(input: {
  projectId: string
  action: string
  userEmail: string
}): Promise<StorytellerBibleLockResponse> {
  return storytellerBibleLockResponseSchema.parse(
    await fetchJson('/api/storyteller/bible/lock', {
      method: HttpMethod.Post,
      headers: JSON_HEADERS,
      body: JSON.stringify(input),
    })
  )
}

export function parseCreateStorytellerEpisodeRequest(input: unknown) {
  return storytellerCreateEpisodeRequestSchema.parse(input)
}

export async function createStorytellerEpisode(
  body: Parameters<typeof parseCreateStorytellerEpisodeRequest>[0]
): Promise<Record<string, unknown>> {
  const parsed = parseCreateStorytellerEpisodeRequest(body)
  return recordFromJson(
    await fetchJson('/api/storyteller/episodes', {
      method: HttpMethod.Post,
      headers: JSON_HEADERS,
      body: JSON.stringify(parsed),
    })
  )
}

export async function patchStorytellerEpisode(
  episodeId: string,
  body: Record<string, unknown>
): Promise<void> {
  await fetchJsonRecord(joinUrlPath('/api/storyteller/episodes', episodeId), {
    method: HttpMethod.Patch,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  })
}

export async function deleteStorytellerEpisode(episodeId: string): Promise<boolean> {
  try {
    await fetchJson(joinUrlPath('/api/storyteller/episodes', episodeId), {
      method: HttpMethod.Delete,
    })
    return true
  } catch {
    return false
  }
}

export async function fetchStorytellerTimeline(
  episodeId: string,
  beatId?: string | null
): Promise<Record<string, unknown>> {
  const params: Record<string, string> = { [QueryParam.EpisodeId]: episodeId }
  if (beatId) params[QueryParam.BeatId] = beatId
  return recordFromJson(await fetchJson(buildUrl('/api/storyteller/timeline', params)))
}

export async function fetchStorytellerPlan(episodeId: string): Promise<Record<string, unknown>> {
  return recordFromJson(
    await fetchJson(buildUrl('/api/storyteller/plan', { [QueryParam.EpisodeId]: episodeId }))
  )
}

export async function saveStorytellerPlan(body: Record<string, unknown>): Promise<void> {
  await fetchJsonRecord('/api/storyteller/plan', {
    method: HttpMethod.Post,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  })
}

export async function patchStorytellerPlan(body: Record<string, unknown>): Promise<void> {
  await fetchJsonRecord('/api/storyteller/plan', {
    method: HttpMethod.Patch,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  })
}

export async function fetchStorytellerProject(projectId: string): Promise<Record<string, unknown>> {
  return fetchJsonRecord(joinUrlPath('/api/storyteller/projects', projectId))
}

export async function fetchStorytellerProjectOptional(
  projectId: string
): Promise<Record<string, unknown> | null> {
  try {
    return await fetchStorytellerProject(projectId)
  } catch {
    return null
  }
}

export async function patchStorytellerProject(
  projectId: string,
  body: Record<string, unknown>
): Promise<void> {
  await fetchJsonRecord(joinUrlPath('/api/storyteller/projects', projectId), {
    method: HttpMethod.Patch,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  })
}

export async function postStorytellerAction(
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await fetch('/api/storyteller/actions', {
    method: HttpMethod.Post,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  })
  return recordFromJson(await response.json())
}

export async function fetchStorytellerRelationships(
  projectId: string
): Promise<Record<string, unknown>> {
  return fetchJsonRecord(
    buildUrl('/api/storyteller/relationships', { [QueryParam.ProjectId]: projectId })
  )
}

export async function fetchEpisodeBeats(episodeId: string): Promise<Record<string, unknown>> {
  return recordFromJson(await fetchJson(joinUrlPath('/api/storyteller/episodes', episodeId, 'beats')))
}

export async function createEpisodeBeat(
  episodeId: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return recordFromJson(
    await fetchJson(joinUrlPath('/api/storyteller/episodes', episodeId, 'beats'), {
      method: HttpMethod.Post,
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    })
  )
}

export async function patchBeat(beatId: string, body: Record<string, unknown>): Promise<void> {
  await fetchJsonRecord(joinUrlPath('/api/storyteller/beats', beatId), {
    method: HttpMethod.Patch,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  })
}

export async function deleteBeat(beatId: string): Promise<void> {
  await fetchJson(joinUrlPath('/api/storyteller/beats', beatId), {
    method: HttpMethod.Delete,
  })
}

export async function fetchEpisodeBeatsList(episodeId: string): Promise<unknown[]> {
  const data = await fetchJson(joinUrlPath('/api/storyteller/episodes', episodeId, 'beats'))
  return Array.isArray(data) ? data : []
}

export async function editStorytellerScript(input: {
  selection: string
  instruction: string
}): Promise<string> {
  const data = recordFromJson(
    await fetchJson('/api/storyteller/script/edit', {
      method: HttpMethod.Post,
      headers: JSON_HEADERS,
      body: JSON.stringify(input),
    })
  )
  const error = readString(data.error)
  if (error) {
    throw new Error(error)
  }
  return readString(data.result) ?? input.selection
}

export async function saveEpisodePosterVariant(input: {
  episodeId: string
  projectId: string
  croppedImageDataUrl: string
  variantIndex: number
}): Promise<{ posterUrl: string | null }> {
  const data = recordFromJson(
    await fetchJson('/api/storyteller/save-episode-poster-variant', {
      method: HttpMethod.Post,
      headers: JSON_HEADERS,
      body: JSON.stringify(input),
    })
  )
  const posterUrl = data.posterUrl
  return { posterUrl: typeof posterUrl === 'string' ? posterUrl : null }
}

export async function fetchStorytellerBible(projectId: string): Promise<Record<string, unknown>> {
  return recordFromJson(
    await fetchJson(buildUrl('/api/storyteller/bible', { [QueryParam.ProjectId]: projectId }))
  )
}

export async function saveStorytellerBible(input: {
  projectId: string
  bible: Record<string, unknown>
}): Promise<void> {
  const response = await fetch('/api/storyteller/bible', {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }
}

export async function fetchStorytellerWorldSummary(projectId: string): Promise<Record<string, unknown>> {
  return recordFromJson(
    await fetchJson(buildUrl('/api/storyteller/world-summary', { [QueryParam.ProjectId]: projectId }))
  )
}
