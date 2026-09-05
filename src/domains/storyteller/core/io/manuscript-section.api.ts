import { ContentType, HttpMethod, QueryParam } from '@/shared/data/constants/protocol'
import { fetchJson } from '@/shared/data/fetch-json-record'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import { ManuscriptSectionScope } from '@/domains/storyteller/core/manuscript/pack-manuscript-section-brief'
import type { ManuscriptMode } from '@/domains/storyteller/core/types/enums'

const JSON_HEADERS = { 'Content-Type': ContentType.Json }

enum GenerateSectionBodyField {
  Mode = 'mode',
  Scope = 'scope',
  ScriptContent = 'scriptContent',
  Caret = 'caret',
}

export async function compileStorytellerManuscript(input: {
  projectId: string
  episodeId: string
  mode: ManuscriptMode
}): Promise<{ persist: boolean; scriptContent: string }> {
  const data = recordFromJson(
    await fetchJson('/api/storyteller/script/compile', {
      method: HttpMethod.Post,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        [QueryParam.ProjectId]: input.projectId,
        [QueryParam.EpisodeId]: input.episodeId,
        [GenerateSectionBodyField.Mode]: input.mode,
      }),
    })
  )
  const error = readString(data.error)
  if (error) {
    throw new Error(error)
  }
  return {
    persist: data.persist === true,
    scriptContent: readString(data.scriptContent) ?? '',
  }
}

export async function startStorytellerManuscriptSection(input: {
  projectId: string
  episodeId: string
  mode: ManuscriptMode
  scope: ManuscriptSectionScope
  scriptContent: string
  caret: number
}): Promise<{
  runId: string
  status: string
  message: string
  draft: string
  critiques: string
}> {
  const data = recordFromJson(
    await fetchJson('/api/storyteller/script/generate-section', {
      method: HttpMethod.Post,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        [QueryParam.ProjectId]: input.projectId,
        [QueryParam.EpisodeId]: input.episodeId,
        [GenerateSectionBodyField.Mode]: input.mode,
        [GenerateSectionBodyField.Scope]: input.scope,
        [GenerateSectionBodyField.ScriptContent]: input.scriptContent,
        [GenerateSectionBodyField.Caret]: input.caret,
      }),
    })
  )
  const error = readString(data.error)
  if (error) {
    throw new Error(error)
  }
  return {
    runId: readString(data.runId) ?? '',
    status: readString(data.status) ?? '',
    message: readString(data.message) ?? '',
    draft: readString(data.draft) ?? '',
    critiques: readString(data.critiques) ?? '',
  }
}
