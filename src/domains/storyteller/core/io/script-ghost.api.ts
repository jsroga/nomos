import { ContentType, HttpMethod, QueryParam } from '@/shared/data/constants/protocol'
import { fetchJson } from '@/shared/data/fetch-json-record'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import type { ManuscriptMode } from '@/domains/storyteller/core/types/enums'

const JSON_HEADERS = { 'Content-Type': ContentType.Json }

enum ScriptGhostBodyField {
  Prefix = 'prefix',
  Mode = 'mode',
}

export async function completeStorytellerScriptGhost(input: {
  projectId: string
  episodeId: string
  prefix: string
  mode: ManuscriptMode
}): Promise<string> {
  const data = recordFromJson(
    await fetchJson('/api/storyteller/script/complete', {
      method: HttpMethod.Post,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        [QueryParam.ProjectId]: input.projectId,
        [QueryParam.EpisodeId]: input.episodeId,
        [ScriptGhostBodyField.Prefix]: input.prefix,
        [ScriptGhostBodyField.Mode]: input.mode,
      }),
    })
  )
  const error = readString(data.error)
  if (error) {
    throw new Error(error)
  }
  return readString(data.result) ?? ''
}
