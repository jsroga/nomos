import '@/shared/data/server-guard'
import { lookupPromptBody } from '@/domains/storyteller/ai/prompts/registry/prompt-registry-table'
import { StorytellerPromptRegistryId } from '@/domains/storyteller/ai/prompts/registry/prompt-registry-ids'
import { ArtifactKind } from '@/domains/storyteller/core/types/artifact-kind'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { TEXT_GEN_FAST_MODEL } from '@/shared/agent-kernel/models'
import { complete } from '@/shared/ai/gateway'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import type { ProjectScope } from '@/shared/auth/project-scope'
import { ArtifactDraftRunStatus, startArtifactDraft, type StartArtifactDraftResult } from './start-artifact-draft'

enum ArtifactDraftGenerateCopy {
  System = 'Write only the requested series-bible, character, or premise content. No preamble. Use JSON arrays of objects when the section is a list.',
  Empty = 'Model returned an empty artifact draft.',
}

const ARTIFACT_KINDS = [
  ArtifactKind.BibleSection,
  ArtifactKind.Character,
  ArtifactKind.EpisodePremise,
] as const

const BIBLE_SECTIONS = Object.values(BibleSection)
const PROMPT_IDS = Object.values(StorytellerPromptRegistryId)

export function parseArtifactKind(value: string | undefined): ArtifactKind | undefined {
  return ARTIFACT_KINDS.find(kind => kind === value)
}

export function parseBibleSection(value: string | undefined): BibleSection | undefined {
  return BIBLE_SECTIONS.find(section => section === value)
}

export function parsePromptRegistryId(
  value: string | undefined
): StorytellerPromptRegistryId | undefined {
  return PROMPT_IDS.find(id => id === value)
}

export interface GenerateArtifactDraftInput {
  scope: ProjectScope
  kind: ArtifactKind
  promptId: StorytellerPromptRegistryId
  section?: BibleSection
  characterId?: string
  episodeId?: string
}

export async function generateAndStartArtifactDraft(
  input: GenerateArtifactDraftInput
): Promise<StartArtifactDraftResult> {
  const instruction = lookupPromptBody(input.promptId)
  const generated = await complete({
    scope: input.scope,
    feature: LlmFeature.StorytellerEntityDescription,
    model: TEXT_GEN_FAST_MODEL,
    system: ArtifactDraftGenerateCopy.System,
    prompt: instruction,
  })
  const draft = generated.text.trim()
  if (!draft) {
    return {
      runId: '',
      status: ArtifactDraftRunStatus.Failed,
      message: ArtifactDraftGenerateCopy.Empty,
    }
  }
  return startArtifactDraft({
    projectId: input.scope.projectId,
    kind: input.kind,
    draft,
    section: input.section,
    characterId: input.characterId,
    episodeId: input.episodeId,
  })
}
