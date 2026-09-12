import '@/shared/data/server-guard'
import { z } from 'zod'
import { ArtifactKind } from '@/domains/storyteller/core/types/artifact-kind'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import {
  CharacterMetricFieldKey,
  CharacterTextFieldKey,
} from '@/domains/storyteller/core/character-missing-fields'
import { clampedCharacterMetricSchema } from '@/domains/storyteller/core/character-metric-schema'
import { TEXT_GEN_FAST_MODEL } from '@/shared/agent-kernel/models'
import { completeStructured } from '@/shared/ai/gateway'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import type { ProjectScope } from '@/shared/auth/project-scope'
import { readString, recordFromJson } from '@/shared/data/json-guards'

enum ArtifactDraftStructuredField {
  Items = 'items',
  Description = 'description',
}

enum ArtifactDraftGenerateCopy {
  System = 'Write only the requested series-bible, character, or premise content. No preamble.',
}

const namedEntrySchema = z.object({
  name: z.string(),
  description: z.string(),
})

const worldRuleEntrySchema = z.object({
  name: z.string(),
  rule: z.string(),
})

const inspirationItemSchema = z.object({
  title: z.string(),
  description: z.string(),
})

const soundtrackTrackSchema = z.object({
  title: z.string(),
  artist: z.string(),
  youtubeUrl: z.string(),
})

const plotTwistEntrySchema = z.object({
  title: z.string(),
  description: z.string(),
})

const roadmapEpisodeSchema = z.object({
  title: z.string(),
  logline: z.string(),
  incitingIncident: z.string().optional(),
  midpoint: z.string().optional(),
  finale: z.string().optional(),
})

const listSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ [ArtifactDraftStructuredField.Items]: z.array(item) })

const proseSchema = z.object({
  [ArtifactDraftStructuredField.Description]: z.string(),
})

const inspirationsSchema = z.object({
  books: z.array(inspirationItemSchema).optional(),
  movies: z.array(inspirationItemSchema).optional(),
  games: z.array(inspirationItemSchema).optional(),
})

const roadmapSchema = z.object({
  episodes: z.array(roadmapEpisodeSchema).optional(),
  sequences: z.array(roadmapEpisodeSchema).optional(),
  executiveSummary: z.string().optional(),
})

const premiseSchema = z.object({
  title: z.string().optional(),
  logline: z.string(),
  theHook: z.string().optional(),
  theTurn: z.string().optional(),
  theAftermath: z.string().optional(),
  protagonistHook: z.string().optional(),
  fatalFlaw: z.string().optional(),
  stakes: z.string().optional(),
  transformation: z.string().optional(),
  inevitableConsequence: z.string().optional(),
  thematicFocus: z.string().optional(),
  charactersInvolved: z.array(z.string()).optional(),
  tenPointsPlan: z.array(z.string()).optional(),
})

const characterSchema = z.object({
  [CharacterTextFieldKey.Name]: z.string().optional(),
  [CharacterTextFieldKey.Gender]: z.string().optional(),
  [CharacterTextFieldKey.Role]: z.string().optional(),
  [CharacterTextFieldKey.Description]: z.string().optional(),
  [CharacterTextFieldKey.Mbti]: z.string().optional(),
  [CharacterTextFieldKey.Motivation]: z.string().optional(),
  [CharacterTextFieldKey.FatalFlaw]: z.string().optional(),
  [CharacterTextFieldKey.Secrets]: z.string().optional(),
  metrics: z
    .object({
      [CharacterMetricFieldKey.Valence]: clampedCharacterMetricSchema(
        CharacterMetricFieldKey.Valence,
      ).optional(),
      [CharacterMetricFieldKey.Arousal]: clampedCharacterMetricSchema(
        CharacterMetricFieldKey.Arousal,
      ).optional(),
      [CharacterMetricFieldKey.Autonomy]: clampedCharacterMetricSchema(
        CharacterMetricFieldKey.Autonomy,
      ).optional(),
      [CharacterMetricFieldKey.Competence]: clampedCharacterMetricSchema(
        CharacterMetricFieldKey.Competence,
      ).optional(),
      [CharacterMetricFieldKey.Relatedness]: clampedCharacterMetricSchema(
        CharacterMetricFieldKey.Relatedness,
      ).optional(),
      [CharacterMetricFieldKey.CognitiveClarity]: clampedCharacterMetricSchema(
        CharacterMetricFieldKey.CognitiveClarity,
      ).optional(),
      [CharacterMetricFieldKey.PerceivedStakes]: clampedCharacterMetricSchema(
        CharacterMetricFieldKey.PerceivedStakes,
      ).optional(),
      [CharacterMetricFieldKey.SocialSafety]: clampedCharacterMetricSchema(
        CharacterMetricFieldKey.SocialSafety,
      ).optional(),
      [CharacterMetricFieldKey.MoralAlignment]: clampedCharacterMetricSchema(
        CharacterMetricFieldKey.MoralAlignment,
      ).optional(),
    })
    .optional(),
})

export function serializeArtifactDraftProse(value: unknown): string {
  return readString(recordFromJson(value)[ArtifactDraftStructuredField.Description]) ?? ''
}

export function serializeArtifactDraftJson(value: unknown): string {
  return JSON.stringify(value)
}

export function serializeArtifactDraftItems(value: unknown): string {
  const rec = recordFromJson(value)
  const items = rec[ArtifactDraftStructuredField.Items]
  if (Array.isArray(items)) return JSON.stringify(items)
  if (Array.isArray(value)) return JSON.stringify(value)
  return ''
}

interface ArtifactDraftStructuredSpec {
  schema: z.ZodType<unknown>
  serialize: (value: unknown) => string
}

const namedListSpec: ArtifactDraftStructuredSpec = {
  schema: listSchema(namedEntrySchema),
  serialize: serializeArtifactDraftItems,
}

const BIBLE_SECTION_SPECS: Partial<Record<BibleSection, ArtifactDraftStructuredSpec>> = {
  [BibleSection.WORLD_DESCRIPTION]: { schema: proseSchema, serialize: serializeArtifactDraftProse },
  [BibleSection.WORLD_RULES]: {
    schema: listSchema(worldRuleEntrySchema),
    serialize: serializeArtifactDraftItems,
  },
  [BibleSection.FACTIONS]: namedListSpec,
  [BibleSection.ITEMS]: namedListSpec,
  [BibleSection.EVENTS]: namedListSpec,
  [BibleSection.CAST]: namedListSpec,
  [BibleSection.PLOT_TWISTS]: {
    schema: listSchema(plotTwistEntrySchema),
    serialize: serializeArtifactDraftItems,
  },
  [BibleSection.SOUNDTRACKS]: {
    schema: listSchema(soundtrackTrackSchema),
    serialize: serializeArtifactDraftItems,
  },
  [BibleSection.INSPIRATIONS]: {
    schema: inspirationsSchema,
    serialize: serializeArtifactDraftJson,
  },
  [BibleSection.EPISODE_ROADMAP]: {
    schema: roadmapSchema,
    serialize: serializeArtifactDraftJson,
  },
}

const CHARACTER_SPEC: ArtifactDraftStructuredSpec = {
  schema: characterSchema,
  serialize: serializeArtifactDraftJson,
}

const PREMISE_SPEC: ArtifactDraftStructuredSpec = {
  schema: premiseSchema,
  serialize: serializeArtifactDraftJson,
}

const DEFAULT_PROSE_SPEC: ArtifactDraftStructuredSpec = {
  schema: proseSchema,
  serialize: serializeArtifactDraftProse,
}

export function specForArtifactDraft(
  kind: ArtifactKind,
  section?: BibleSection
): ArtifactDraftStructuredSpec {
  if (kind === ArtifactKind.Character) return CHARACTER_SPEC
  if (kind === ArtifactKind.EpisodePremise) return PREMISE_SPEC
  if (section) {
    const bibleSpec = BIBLE_SECTION_SPECS[section]
    if (bibleSpec) return bibleSpec
  }
  return DEFAULT_PROSE_SPEC
}

export async function completeArtifactDraft(input: {
  scope: ProjectScope
  kind: ArtifactKind
  instruction: string
  section?: BibleSection
}): Promise<string> {
  const spec = specForArtifactDraft(input.kind, input.section)
  const object = await completeStructured({
    scope: input.scope,
    feature: LlmFeature.StorytellerEntityDescription,
    model: TEXT_GEN_FAST_MODEL,
    system: ArtifactDraftGenerateCopy.System,
    prompt: input.instruction,
    schema: spec.schema,
  })
  return spec.serialize(object).trim()
}
