import { ContentType, HttpMethod, QueryParam } from '@/shared/data/constants/protocol'
import { fetchJson } from '@/shared/data/fetch-json-record'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import { buildUrl, joinUrlPath } from '@/shared/data/url-builder'

const PORTRAIT_ROUTE = '/api/storyteller/generate-portrait'
const PORTRAIT_STATUS_ROUTE = '/api/storyteller/generate-portrait/status'
const METRICS_ROUTE = '/api/storyteller/generate-metrics'
const SAVE_VARIANT_ROUTE = '/api/storyteller/save-portrait-variant'
const CHARACTERS_ROUTE = '/api/storyteller/characters'

const JSON_HEADERS = { 'Content-Type': ContentType.Json }

export async function startCharacterPortraitGeneration(input: {
  prompt: string
  projectId: string
  apiKey: string
}): Promise<{ handleId: string | null }> {
  const data = recordFromJson(await fetchJson(PORTRAIT_ROUTE, {
    method: HttpMethod.Post,
    headers: { 'Content-Type': ContentType.Json },
    body: JSON.stringify(input),
  }))
  return { handleId: readString(data.handleId) ?? null }
}

export async function fetchCharacterPortraitRunStatus(runId: string): Promise<{
  status: string | null
  imageUrl: string | null
  error: unknown
}> {
  const data = recordFromJson(await fetchJson(buildUrl(PORTRAIT_STATUS_ROUTE, { [QueryParam.RunId]: runId })))
  const output = recordFromJson(data.output)
  return {
    status: readString(data.status) ?? null,
    imageUrl: readString(output.imageUrl) ?? null,
    error: data.error,
  }
}

export async function fetchCharacterMetrics(description: string): Promise<Record<string, unknown>> {
  const data = recordFromJson(await fetchJson(METRICS_ROUTE, {
    method: HttpMethod.Post,
    headers: { 'Content-Type': ContentType.Json },
    body: JSON.stringify({ description }),
  }))
  return recordFromJson(data.metrics)
}

export async function saveCharacterPortraitVariant(input: {
  characterId: string
  projectId: string
  croppedImageDataUrl: string
  variantIndex: number
}): Promise<{ portraitUrl: string | null }> {
  const data = recordFromJson(await fetchJson(SAVE_VARIANT_ROUTE, {
    method: HttpMethod.Post,
    headers: { 'Content-Type': ContentType.Json },
    body: JSON.stringify(input),
  }))
  return { portraitUrl: readString(data.portraitUrl) ?? null }
}

export async function fetchStorytellerCharacters(projectId: string): Promise<unknown[]> {
  const data = await fetchJson(buildUrl(CHARACTERS_ROUTE, { [QueryParam.ProjectId]: projectId }))
  return Array.isArray(data) ? data : []
}

export async function createStorytellerCharacter(
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return recordFromJson(
    await fetchJson(CHARACTERS_ROUTE, {
      method: HttpMethod.Post,
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    })
  )
}

export async function updateStorytellerCharacter(
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return recordFromJson(
    await fetchJson(CHARACTERS_ROUTE, {
      method: HttpMethod.Patch,
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    })
  )
}

export async function deleteStorytellerCharacter(id: string): Promise<boolean> {
  try {
    await fetchJson(buildUrl(CHARACTERS_ROUTE, { [QueryParam.Id]: id }), {
      method: HttpMethod.Delete,
    })
    return true
  } catch {
    return false
  }
}

export async function fetchStorytellerCharacter(characterId: string): Promise<Record<string, unknown>> {
  return recordFromJson(await fetchJson(joinUrlPath(CHARACTERS_ROUTE, characterId)))
}

export async function patchStorytellerCharacter(
  characterId: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return recordFromJson(
    await fetchJson(joinUrlPath(CHARACTERS_ROUTE, characterId), {
      method: HttpMethod.Patch,
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    })
  )
}
