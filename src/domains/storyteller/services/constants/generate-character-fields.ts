import { z } from 'zod'
import { TEXT_GEN_FAST_MODEL } from '@/shared/agent-kernel/models'
import {
  CHARACTER_MISSING_METRICS_MAX,
  CharacterMetricFieldKey,
  CharacterTextFieldKey,
  DEFAULT_CHARACTER_METRICS,
} from '@/domains/storyteller/core/character-missing-fields'

export const GENERATE_CHARACTER_FIELDS_MODEL = TEXT_GEN_FAST_MODEL
export const GENERATE_CHARACTER_FIELDS_TEMPERATURE = 0.6
export const GENERATE_CHARACTER_FIELDS_MAX_RETRIES = 1

export enum GenerateCharacterFieldsErrorName {
  GenerateCharacterFieldsError = 'GenerateCharacterFieldsError',
}

export enum GenerateCharacterFieldsErrorCode {
  InsufficientContext = 'INSUFFICIENT_CONTEXT',
  GenerationFailed = 'GENERATION_FAILED',
  OpenRouterNotConfigured = 'OPENROUTER_NOT_CONFIGURED',
}

export enum GenerateCharacterFieldsCopy {
  System = 'You fill missing fields for a fictional series character. Stay consistent with the series bible, episode premises, existing cast, and any already-filled fields. Never contradict filled fields. Return only the requested missing fields. For psychological metrics, fill only valence, arousal, perceived stakes, and moral alignment.',
  FailedLog = '[GenerateCharacterFields] Generation failed:',
  EmptyJsonObject = '{}',
}

export enum GenerateCharacterFieldsLimit {
  BibleChars = 6000,
  EpisodeFieldChars = 400,
  EpisodeCount = 12,
  CastCount = 24,
}

export enum CharacterDialogGender {
  Male = 'Male',
  Female = 'Female',
  NonBinary = 'Non-binary',
  Other = 'Other',
}

export enum CharacterDialogStoryRole {
  Protagonist = 'Protagonist',
  Antagonist = 'Antagonist',
  Supporting = 'Supporting',
}

export enum CharacterDialogMbti {
  INTJ = 'INTJ',
  INTP = 'INTP',
  ENTJ = 'ENTJ',
  ENTP = 'ENTP',
  INFJ = 'INFJ',
  INFP = 'INFP',
  ENFJ = 'ENFJ',
  ENFP = 'ENFP',
  ISTJ = 'ISTJ',
  ISFJ = 'ISFJ',
  ESTJ = 'ESTJ',
  ESFJ = 'ESFJ',
  ISTP = 'ISTP',
  ISFP = 'ISFP',
  ESTP = 'ESTP',
  ESFP = 'ESFP',
}

export enum GenerateCharacterFieldsPromptLabel {
  MissingText = 'MISSING TEXT FIELDS',
  MissingMetrics = 'MISSING METRICS',
  Filled = 'ALREADY FILLED (do not change)',
  Bible = 'SERIES BIBLE',
  Episodes = 'EPISODES',
  Cast = 'OTHER CAST',
  None = '(none)',
}

const genderSchema = z.enum([
  CharacterDialogGender.Male,
  CharacterDialogGender.Female,
  CharacterDialogGender.NonBinary,
  CharacterDialogGender.Other,
])

const roleSchema = z.enum([
  CharacterDialogStoryRole.Protagonist,
  CharacterDialogStoryRole.Antagonist,
  CharacterDialogStoryRole.Supporting,
])

const mbtiSchema = z.enum([
  CharacterDialogMbti.INTJ,
  CharacterDialogMbti.INTP,
  CharacterDialogMbti.ENTJ,
  CharacterDialogMbti.ENTP,
  CharacterDialogMbti.INFJ,
  CharacterDialogMbti.INFP,
  CharacterDialogMbti.ENFJ,
  CharacterDialogMbti.ENFP,
  CharacterDialogMbti.ISTJ,
  CharacterDialogMbti.ISFJ,
  CharacterDialogMbti.ESTJ,
  CharacterDialogMbti.ESFJ,
  CharacterDialogMbti.ISTP,
  CharacterDialogMbti.ISFP,
  CharacterDialogMbti.ESTP,
  CharacterDialogMbti.ESFP,
])

const metricValueSchema = z.number().min(-100).max(100)

export const generatedCharacterMetricsSchema = z.object({
  [CharacterMetricFieldKey.Valence]: metricValueSchema.optional(),
  [CharacterMetricFieldKey.Arousal]: metricValueSchema.min(0).optional(),
  [CharacterMetricFieldKey.Autonomy]: metricValueSchema.min(0).optional(),
  [CharacterMetricFieldKey.Competence]: metricValueSchema.min(0).optional(),
  [CharacterMetricFieldKey.Relatedness]: metricValueSchema.min(0).optional(),
  [CharacterMetricFieldKey.CognitiveClarity]: metricValueSchema.min(0).optional(),
  [CharacterMetricFieldKey.PerceivedStakes]: metricValueSchema.min(0).optional(),
  [CharacterMetricFieldKey.SocialSafety]: metricValueSchema.min(0).optional(),
  [CharacterMetricFieldKey.MoralAlignment]: metricValueSchema.min(0).optional(),
})

export const generatedCharacterFieldsSchema = z.object({
  [CharacterTextFieldKey.Name]: z.string().min(1).optional(),
  [CharacterTextFieldKey.Gender]: genderSchema.optional(),
  [CharacterTextFieldKey.Role]: roleSchema.optional(),
  [CharacterTextFieldKey.Description]: z.string().min(1).optional(),
  [CharacterTextFieldKey.Mbti]: mbtiSchema.optional(),
  [CharacterTextFieldKey.Motivation]: z.string().min(1).optional(),
  [CharacterTextFieldKey.FatalFlaw]: z.string().min(1).optional(),
  [CharacterTextFieldKey.Secrets]: z.string().min(1).optional(),
  metrics: generatedCharacterMetricsSchema.optional(),
})

const generatedCharacterMetricsLlmSchema = z.object({
  [CharacterMetricFieldKey.Valence]: metricValueSchema,
  [CharacterMetricFieldKey.Arousal]: metricValueSchema.min(0),
  [CharacterMetricFieldKey.PerceivedStakes]: metricValueSchema.min(0),
  [CharacterMetricFieldKey.MoralAlignment]: metricValueSchema.min(0),
})

export const generatedCharacterFieldsLlmSchema = z.object({
  [CharacterTextFieldKey.Name]: z.string().min(1),
  [CharacterTextFieldKey.Gender]: genderSchema,
  [CharacterTextFieldKey.Role]: roleSchema,
  [CharacterTextFieldKey.Description]: z.string().min(1),
  [CharacterTextFieldKey.Mbti]: mbtiSchema,
  [CharacterTextFieldKey.Motivation]: z.string().min(1),
  [CharacterTextFieldKey.FatalFlaw]: z.string().min(1),
  [CharacterTextFieldKey.Secrets]: z.string().min(1),
  metrics: generatedCharacterMetricsLlmSchema,
})

const filledMetricsSchema = z.object({
  [CharacterMetricFieldKey.Valence]: z.number(),
  [CharacterMetricFieldKey.Arousal]: z.number(),
  [CharacterMetricFieldKey.Autonomy]: z.number(),
  [CharacterMetricFieldKey.Competence]: z.number(),
  [CharacterMetricFieldKey.Relatedness]: z.number(),
  [CharacterMetricFieldKey.CognitiveClarity]: z.number(),
  [CharacterMetricFieldKey.PerceivedStakes]: z.number(),
  [CharacterMetricFieldKey.SocialSafety]: z.number(),
  [CharacterMetricFieldKey.MoralAlignment]: z.number(),
})

export const generateCharacterFieldsRequestSchema = z.object({
  projectId: z.string().uuid(),
  filled: z.object({
    [CharacterTextFieldKey.Name]: z.string(),
    [CharacterTextFieldKey.Gender]: z.string(),
    [CharacterTextFieldKey.Role]: z.string(),
    [CharacterTextFieldKey.Description]: z.string(),
    [CharacterTextFieldKey.Mbti]: z.string(),
    [CharacterTextFieldKey.Motivation]: z.string(),
    [CharacterTextFieldKey.FatalFlaw]: z.string(),
    [CharacterTextFieldKey.Secrets]: z.string(),
    metrics: filledMetricsSchema.default(DEFAULT_CHARACTER_METRICS),
  }),
})

export const generateCharacterFieldsResponseSchema = z.object({
  fields: generatedCharacterFieldsSchema,
})

export type GenerateCharacterFieldsRequest = z.infer<typeof generateCharacterFieldsRequestSchema>

export interface CharacterStoryEpisodeContext {
  title?: string | null
  summary?: string | null
  premise?: string | null
  thematicFocus?: string | null
}

export interface CharacterStoryCastMember {
  name: string
  role: string
}

export interface CharacterStoryContext {
  bibleText: string
  episodes: CharacterStoryEpisodeContext[]
  cast: CharacterStoryCastMember[]
}

function clip(value: string, max: number): string {
  if (value.length <= max) return value
  return value.slice(0, max)
}

function joinNonEmpty(parts: Array<string | null | undefined>, separator: string): string {
  return parts
    .map(part => part?.trim() ?? '')
    .filter(part => part.length > 0)
    .join(separator)
}

export function hasUsableStoryContext(context: CharacterStoryContext): boolean {
  if (context.bibleText.trim().length > 2) return true
  return context.episodes.some(episode =>
    Boolean(
      episode.title?.trim() ||
        episode.summary?.trim() ||
        episode.premise?.trim() ||
        episode.thematicFocus?.trim()
    )
  )
}

export function formatCharacterStoryContext(context: CharacterStoryContext): string {
  const episodes = context.episodes
    .slice(0, GenerateCharacterFieldsLimit.EpisodeCount)
    .map((episode, index) => {
      const body = joinNonEmpty(
        [
          episode.title,
          episode.premise,
          episode.summary,
          episode.thematicFocus,
        ].map(part => (part ? clip(part, GenerateCharacterFieldsLimit.EpisodeFieldChars) : part)),
        ' — '
      )
      return body.length > 0 ? `${index + 1}. ${body}` : ''
    })
    .filter(line => line.length > 0)

  const cast = context.cast
    .slice(0, GenerateCharacterFieldsLimit.CastCount)
    .map(member => `${member.name} (${member.role})`)

  return [
    `${GenerateCharacterFieldsPromptLabel.Bible}:\n${clip(context.bibleText, GenerateCharacterFieldsLimit.BibleChars) || GenerateCharacterFieldsPromptLabel.None}`,
    `${GenerateCharacterFieldsPromptLabel.Episodes}:\n${episodes.join('\n') || GenerateCharacterFieldsPromptLabel.None}`,
    `${GenerateCharacterFieldsPromptLabel.Cast}:\n${cast.join(', ') || GenerateCharacterFieldsPromptLabel.None}`,
  ].join('\n\n')
}

export function characterFieldsUserPrompt(input: {
  missingText: string[]
  missingMetrics: string[]
  filledSummary: string
  storyContext: string
}): string {
  const missingMetrics =
    input.missingMetrics.length > 0
      ? `${GenerateCharacterFieldsPromptLabel.MissingMetrics} (${CHARACTER_MISSING_METRICS_MAX}): ${input.missingMetrics.join(', ')}`
      : `${GenerateCharacterFieldsPromptLabel.MissingMetrics}: ${GenerateCharacterFieldsPromptLabel.None}`

  return [
    `${GenerateCharacterFieldsPromptLabel.MissingText}: ${input.missingText.join(', ') || GenerateCharacterFieldsPromptLabel.None}`,
    missingMetrics,
    `${GenerateCharacterFieldsPromptLabel.Filled}:\n${input.filledSummary || GenerateCharacterFieldsPromptLabel.None}`,
    input.storyContext,
  ].join('\n\n')
}
