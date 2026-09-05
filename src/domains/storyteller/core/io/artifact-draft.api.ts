import { ContentType, HttpMethod, QueryParam } from '@/shared/data/constants/protocol'
import { fetchJson } from '@/shared/data/fetch-json-record'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import type { ArtifactKind } from '@/domains/storyteller/core/types/artifact-kind'
import type { BibleSection } from '@/domains/storyteller/core/types/enums'
import type { StorytellerPromptRegistryId } from '@/domains/storyteller/ai/prompts/registry/prompt-registry-ids'

const JSON_HEADERS = { 'Content-Type': ContentType.Json }

enum ArtifactDraftBodyField {
  Kind = 'kind',
  Section = 'section',
  PromptId = 'promptId',
  CharacterId = 'characterId',
}

const ARTIFACT_DRAFT_PATH = '/api/storyteller/artifact-draft'

export async function startStorytellerArtifactDraft(input: {
  projectId: string
  kind: ArtifactKind
  promptId: StorytellerPromptRegistryId
  section?: BibleSection
  characterId?: string
  episodeId?: string
}): Promise<{
  runId: string
  status: string
  message: string
  draft: string
  critiques: string
}> {
  const data = recordFromJson(
    await fetchJson(ARTIFACT_DRAFT_PATH, {
      method: HttpMethod.Post,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        [QueryParam.ProjectId]: input.projectId,
        [ArtifactDraftBodyField.Kind]: input.kind,
        [ArtifactDraftBodyField.PromptId]: input.promptId,
        [ArtifactDraftBodyField.Section]: input.section,
        [ArtifactDraftBodyField.CharacterId]: input.characterId,
        [QueryParam.EpisodeId]: input.episodeId,
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
