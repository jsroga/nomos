import '@/shared/data/server-guard'
import { meteredCall } from '@/shared/ai/gateway/agent'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import {
  isValidationError,
  noopObserve,
  type ToolExecutionContext,
  type ValidationError,
} from '@mastra/core/tools'
import type { Agent } from '@mastra/core/agent'
import {
  continuityCritic,
  stakesCritic,
  CriticReportSchema,
  formatCriticReport,
} from '@/domains/storyteller/ai/agents/critics'
import { updateWorldBibleTool } from '@/domains/storyteller/ai/tools/bible-tools'
import { manageCharacterTool } from '@/domains/storyteller/ai/tools/character-tools'
import { manageEpisodeTool } from '@/domains/storyteller/ai/tools/episode-tools'
import { getEpisodeOperation } from '@/domains/storyteller/ai/tools/episode-tool-operations'
import { ManageToolOperation } from '@/domains/storyteller/ai/tools/manage-tools-wire'
import { persistBibleOwnedPlanFields } from '@/domains/storyteller/core/io/persist-bible-owned-plan'
import { ArtifactKind } from '@/domains/storyteller/core/types/artifact-kind'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { ProblemType } from '@/domains/storyteller/core/types/finding'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import {
  BEAT_DRAFT_NO_FINDINGS,
  BeatDraftCriticName,
  BeatDraftStructuredOutputErrorStrategy,
} from './constants/beat-draft-workflow'
import { checkArtifactWorldRuleContinuity } from '@/domains/storyteller/core/artifact/check-artifact-world-rule-continuity'
import { assembleCanon } from './fix-inconsistencies-default-deps'
import type { ArtifactDraftDeps, ArtifactDraftInput, ArtifactDraftPersistResult } from './artifact-draft-deps-types'

enum ArtifactDraftPersistCopy {
  BibleSaved = 'Bible section persisted.',
  CharacterSaved = 'Character persisted.',
  PremiseSaved = 'Episode premise persisted.',
  SectionRequired = 'Bible section is required to persist.',
  EpisodeRequired = 'Episode id is required to persist premise.',
  EpisodeMissing = 'Episode not found.',
  PersistFailed = 'Persist failed.',
}

enum ArtifactDraftFallback {
  Name = 'Draft',
}

enum CharacterNameMax {
  Value = 80,
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function worldRuleStrings(worldRulesJson: string): string[] {
  const parsed = parseJson(worldRulesJson)
  if (!Array.isArray(parsed)) return []
  const rules: string[] = []
  for (const entry of parsed) {
    if (typeof entry === 'string' && entry.length > 0) {
      rules.push(entry)
      continue
    }
    const rule = readString(recordFromJson(entry).rule)
    if (rule) rules.push(rule)
  }
  return rules
}

function namedList(draft: string, parsed: unknown): unknown {
  if (Array.isArray(parsed)) return parsed
  return [{ name: ArtifactDraftFallback.Name, description: draft }]
}

function bibleFieldValue(section: BibleSection, draft: string): unknown {
  const parsed = parseJson(draft)
  if (section === BibleSection.WORLD_RULES) {
    if (Array.isArray(parsed)) return parsed
    return [{ rule: draft }]
  }
  if (
    section === BibleSection.FACTIONS ||
    section === BibleSection.ITEMS ||
    section === BibleSection.EVENTS ||
    section === BibleSection.PLOT_TWISTS ||
    section === BibleSection.CAST ||
    section === BibleSection.SOUNDTRACKS
  ) {
    return namedList(draft, parsed)
  }
  if (section === BibleSection.INSPIRATIONS) {
    const rec = recordFromJson(parsed)
    if (Object.keys(rec).length > 0) return rec
    return { books: [{ title: draft }] }
  }
  return typeof parsed === 'string' ? parsed : draft
}

async function invokeTool<TInput, TOutput>(
  tool: {
    id: string
    execute?: (
      inputData: TInput,
      context: ToolExecutionContext
    ) => Promise<TOutput | ValidationError | undefined>
  },
  input: TInput
): Promise<TOutput> {
  if (!tool.execute) {
    throw new Error(`Tool ${tool.id} has no execute function`)
  }
  const result = await tool.execute(input, { observe: noopObserve })
  if (result === undefined || result === null) {
    throw new Error(`Tool ${tool.id} returned no result`)
  }
  if (isValidationError(result)) {
    throw new Error(`Tool ${tool.id} input validation failed`)
  }
  return result
}

async function runCritic(critic: Agent, name: string, prompt: string): Promise<string> {
  try {
    const response = await meteredCall(LlmFeature.StorytellerBeatPlan, () =>
      critic.generate(prompt, {
        structuredOutput: {
          schema: CriticReportSchema,
          errorStrategy: BeatDraftStructuredOutputErrorStrategy.Warn,
        },
      })
    )
    const parsed = CriticReportSchema.safeParse(response.object)
    if (!parsed.success) {
      return `## ${name} findings\n${response.text || BEAT_DRAFT_NO_FINDINGS}`
    }
    return formatCriticReport(name, parsed.data)
  } catch {
    return `## ${name} findings\n${BEAT_DRAFT_NO_FINDINGS}`
  }
}

function characterPayload(draft: string): { name: string; description: string } {
  const parsed = parseJson(draft)
  const rec = recordFromJson(parsed)
  const name = readString(rec.name)
  const description = readString(rec.description) ?? draft
  if (name) return { name, description }
  if (typeof parsed === 'string') {
    return {
      name: parsed.slice(0, CharacterNameMax.Value),
      description: parsed,
    }
  }
  return { name: ArtifactDraftFallback.Name, description: draft }
}

function premisePayload(draft: string): Record<string, unknown> {
  const rec = recordFromJson(parseJson(draft))
  if (Object.keys(rec).length > 0) return rec
  return { logline: draft }
}

async function persistBible(input: ArtifactDraftInput): Promise<ArtifactDraftPersistResult> {
  if (!input.section) {
    return { persisted: false, message: ArtifactDraftPersistCopy.SectionRequired }
  }
  const value = bibleFieldValue(input.section, input.draft)
  const toolInput: Record<string, unknown> = {
    projectId: input.projectId,
    [input.section]: value,
  }
  await invokeTool(updateWorldBibleTool, toolInput)
  const written = await persistBibleOwnedPlanFields(input.projectId, { [input.section]: value })
  return {
    persisted: Object.keys(written).length > 0,
    message: ArtifactDraftPersistCopy.BibleSaved,
  }
}

async function persistCharacter(input: ArtifactDraftInput): Promise<ArtifactDraftPersistResult> {
  const data = characterPayload(input.draft)
  const operation = input.characterId ? ManageToolOperation.Update : ManageToolOperation.Create
  const result = await invokeTool(manageCharacterTool, {
    operation,
    projectId: input.projectId,
    characterId: input.characterId,
    data,
  })
  const rec = recordFromJson(result)
  return {
    persisted: rec.success === true,
    message: readString(rec.message) ?? ArtifactDraftPersistCopy.CharacterSaved,
  }
}

async function persistPremise(input: ArtifactDraftInput): Promise<ArtifactDraftPersistResult> {
  if (!input.episodeId) {
    return { persisted: false, message: ArtifactDraftPersistCopy.EpisodeRequired }
  }
  const existing = await getEpisodeOperation(input.episodeId)
  if (!existing.success || !existing.episode) {
    return { persisted: false, message: ArtifactDraftPersistCopy.EpisodeMissing }
  }
  const result = await invokeTool(manageEpisodeTool, {
    operation: ManageToolOperation.Update,
    episodeId: input.episodeId,
    projectId: input.projectId,
    data: {
      title: existing.episode.title,
      premise: premisePayload(input.draft),
    },
  })
  const rec = recordFromJson(result)
  return {
    persisted: rec.success === true,
    message: readString(rec.message) ?? ArtifactDraftPersistCopy.PremiseSaved,
  }
}

export const defaultArtifactDraftDeps: ArtifactDraftDeps = {
  assemble: async input => {
    const canon = await assembleCanon(input.projectId)
    return {
      canonText: canon.bibleJson,
      worldRules: worldRuleStrings(canon.worldRulesJson),
    }
  },

  checkDeterministic: async input => checkArtifactWorldRuleContinuity(input),

  critique: async (scope, draft, canonText) => {
    const prompt = `CANON:\n${canonText}\n\nDRAFT:\n${draft}`
    if (scope === ProblemType.DecisionOwnership) {
      return runCritic(stakesCritic, BeatDraftCriticName.Stakes, prompt)
    }
    return runCritic(continuityCritic, BeatDraftCriticName.Continuity, prompt)
  },

  persist: async input => {
    if (input.kind === ArtifactKind.Character) return persistCharacter(input)
    if (input.kind === ArtifactKind.EpisodePremise) return persistPremise(input)
    if (input.kind === ArtifactKind.BibleSection) return persistBible(input)
    return { persisted: false, message: ArtifactDraftPersistCopy.PersistFailed }
  },
}
