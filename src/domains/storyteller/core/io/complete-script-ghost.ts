import '@/shared/data/server-guard'
import { db } from '@/domains/storyteller/core/io/beat-sequence'
import { characters, episodes } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { TEXT_GEN_FAST_MODEL } from '@/shared/agent-kernel/models'
import { complete } from '@/shared/ai/gateway'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import type { ProjectScope } from '@/shared/auth/project-scope'
import { loadProjectMasterPrompt } from '@/domains/storyteller/core/io/beat-sequence'
import { voiceFingerprintFromUnknown } from '@/domains/storyteller/core/voice/voice-fingerprint'
import type { NamedVoiceFingerprint } from '@/domains/storyteller/core/voice/pack-involved-voice-fingerprints'
import { defaultBeatDraftDeps } from '@/domains/storyteller/ai/workflows/beat-draft-default-deps'
import {
  beatsCoveringCaret,
  packScriptGhostContext,
} from '@/domains/storyteller/ai/workflows/pack-script-ghost-context'
import {
  episodePremiseText,
  involvedNamesFromCoveringBeats,
  scriptGhostSystemPrompt,
} from '@/domains/storyteller/core/io/complete-script-ghost-pack'
import type { ManuscriptMode } from '@/domains/storyteller/core/types/enums'

export {
  episodePremiseText,
  involvedNamesFromCoveringBeats,
  ScriptGhostCopy,
  scriptGhostSystemPrompt,
} from '@/domains/storyteller/core/io/complete-script-ghost-pack'

function fingerprintsFromRows(
  rows: readonly { name: string; voice: unknown }[]
): NamedVoiceFingerprint[] {
  return rows.map(row => ({
    name: row.name,
    voice: voiceFingerprintFromUnknown(row.voice),
  }))
}

export async function completeScriptGhost(input: {
  scope: ProjectScope
  episodeId: string
  prefix: string
  mode: ManuscriptMode
}): Promise<string> {
  const projectId = input.scope.projectId
  const canon = await defaultBeatDraftDeps.assembleCanon({
    projectId,
    episodeId: input.episodeId,
    brief: input.episodeId,
    characters: [],
  })
  const covering = beatsCoveringCaret(canon.beats, input.prefix)
  const involved = involvedNamesFromCoveringBeats(covering)
  const [masterPrompt, episodeRows, characterRows] = await Promise.all([
    loadProjectMasterPrompt(projectId),
    db
      .select({ premise: episodes.premise, storyPlan: episodes.storyPlan })
      .from(episodes)
      .where(eq(episodes.id, input.episodeId))
      .limit(1),
    db
      .select({ name: characters.name, voice: characters.voice })
      .from(characters)
      .where(eq(characters.projectId, projectId)),
  ])
  const episode = episodeRows[0]
  const packed = packScriptGhostContext({
    masterPrompt,
    canon,
    episodePremise: episodePremiseText(episode?.premise, episode?.storyPlan),
    prefix: input.prefix,
    charactersInvolved: involved,
    fingerprints: fingerprintsFromRows(characterRows),
  })
  const result = await complete({
    scope: input.scope,
    feature: LlmFeature.StorytellerScriptGhost,
    model: TEXT_GEN_FAST_MODEL,
    system: scriptGhostSystemPrompt(input.mode),
    prompt: packed,
  })
  return result.text.trim()
}
