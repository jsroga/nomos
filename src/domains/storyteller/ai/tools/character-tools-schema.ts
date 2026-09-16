import { z } from 'zod'
import { VoiceFingerprintSchema } from '@/domains/storyteller/core/voice/voice-fingerprint'
import { CharacterMetricFieldKey } from '@/domains/storyteller/core/character-missing-fields'
import {
  clampedCharacterMetricSchema,
  clampedUnitMetricSchema,
} from '@/domains/storyteller/core/character-metric-schema'
import { INJECTED_PROJECT_ID_DESC, ManageToolOperation } from './manage-tools-wire'

export const CharacterPsychologySchema = z
  .object({
    actualMotivation: z.string().optional(),
    fears: z.string().optional(),
    desires: z.string().optional(),
    delusions: z.string().optional(),
    secrets: z.string().optional(),
    fatalFlaw: z.string().optional(),
    traits: z.array(z.string()).optional(),
  })
  .optional()
  .describe('Deep psychological profile')

export const CharacterDataSchema = z.object({
  name: z.string().min(1).describe('Character name'),
  role: z
    .enum(['Protagonist', 'Antagonist', 'Supporting', 'Background', 'Lead'])
    .optional()
    .describe('Character role in the story'),
  description: z.string().optional().describe('Physical and personality description'),
  shortDescription: z.string().optional().describe('Brief one-line description'),
  gender: z.string().optional().describe('Gender identity'),
  mbti: z.string().optional().describe('MBTI personality type'),
  portraitUrl: z.string().url().optional().describe('Character portrait image URL'),
  characterPrompt: z.string().optional().describe('Internal character prompt'),
  psychology: CharacterPsychologySchema,
  [CharacterMetricFieldKey.Valence]: clampedCharacterMetricSchema(CharacterMetricFieldKey.Valence)
    .optional()
    .describe('Emotional valence -100 to 100'),
  [CharacterMetricFieldKey.Arousal]: clampedCharacterMetricSchema(CharacterMetricFieldKey.Arousal)
    .optional()
    .describe('Arousal 0-100'),
  [CharacterMetricFieldKey.Autonomy]: clampedCharacterMetricSchema(CharacterMetricFieldKey.Autonomy)
    .optional()
    .describe('Autonomy 0-100'),
  [CharacterMetricFieldKey.Competence]: clampedCharacterMetricSchema(
    CharacterMetricFieldKey.Competence,
  )
    .optional()
    .describe('Competence 0-100'),
  [CharacterMetricFieldKey.Relatedness]: clampedCharacterMetricSchema(
    CharacterMetricFieldKey.Relatedness,
  )
    .optional()
    .describe('Relatedness 0-100'),
  [CharacterMetricFieldKey.CognitiveClarity]: clampedCharacterMetricSchema(
    CharacterMetricFieldKey.CognitiveClarity,
  )
    .optional()
    .describe('Cognitive clarity 0-100'),
  [CharacterMetricFieldKey.PerceivedStakes]: clampedCharacterMetricSchema(
    CharacterMetricFieldKey.PerceivedStakes,
  )
    .optional()
    .describe('Perceived stakes 0-100'),
  [CharacterMetricFieldKey.SocialSafety]: clampedCharacterMetricSchema(
    CharacterMetricFieldKey.SocialSafety,
  )
    .optional()
    .describe('Social safety 0-100'),
  [CharacterMetricFieldKey.MoralAlignment]: clampedCharacterMetricSchema(
    CharacterMetricFieldKey.MoralAlignment,
  )
    .optional()
    .describe('Moral alignment 0-100'),
  transformationProgress: clampedUnitMetricSchema().optional().describe('Transformation progress 0-100'),
  voice: z.union([z.string(), VoiceFingerprintSchema]).optional(),
})

/** Drop a truncated or invented projectId so OPEN WORKSPACE can inject the real one. */
function optionalInjectedUuid(value: unknown): unknown {
  if (typeof value !== 'string' || value.length === 0) return undefined
  const parsed = z.string().uuid().safeParse(value)
  return parsed.success ? parsed.data : undefined
}

const injectedProjectIdSchema = z.preprocess(
  optionalInjectedUuid,
  z.string().uuid().optional().describe(INJECTED_PROJECT_ID_DESC),
)

export const ManageCharacterInputSchema = z.object({
  operation: z
    .enum([
      ManageToolOperation.Create,
      ManageToolOperation.Update,
      ManageToolOperation.Delete,
      ManageToolOperation.Get,
      ManageToolOperation.List,
    ])
    .describe('The operation to perform'),
  characterId: z.string().uuid().optional().describe('Character ID for update/delete/get operations'),
  projectId: injectedProjectIdSchema,
  data: CharacterDataSchema.optional().describe('Character data for create/update'),
})

export const ListCharactersInputSchema = z.object({
  projectId: z.string().uuid().optional().describe(INJECTED_PROJECT_ID_DESC),
  role: z
    .enum(['Protagonist', 'Antagonist', 'Supporting', 'Background', 'Lead'])
    .optional()
    .describe('Filter by role'),
})

export const CharacterOutputSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
  role: z.string(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  gender: z.string().optional(),
  mbti: z.string().optional(),
  portraitUrl: z.string().optional(),
  psychology: z.record(z.unknown()).optional(),
  voice: VoiceFingerprintSchema.optional(),
  valence: z.number().optional(),
  arousal: z.number().optional(),
  autonomy: z.number().optional(),
  competence: z.number().optional(),
  relatedness: z.number().optional(),
})

export const ManageCharacterOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
  character: CharacterOutputSchema.optional(),
})

export const ListCharactersOutputSchema = z.object({
  success: z.boolean(),
  characters: z.array(CharacterOutputSchema),
  count: z.number(),
  error: z.string().optional(),
})

export type CharacterData = z.infer<typeof CharacterDataSchema>
