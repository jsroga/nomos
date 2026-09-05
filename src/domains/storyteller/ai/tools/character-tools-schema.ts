import { z } from 'zod'
import { VoiceFingerprintSchema } from '@/domains/storyteller/core/voice/voice-fingerprint'
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
  valence: z.number().min(-100).max(100).optional().describe('Emotional valence'),
  arousal: z.number().min(0).max(100).optional().describe('Arousal level'),
  autonomy: z.number().min(0).max(100).optional().describe('Autonomy level'),
  competence: z.number().min(0).max(100).optional().describe('Competence level'),
  relatedness: z.number().min(0).max(100).optional().describe('Relatedness level'),
  cognitiveClarity: z.number().min(0).max(100).optional().describe('Cognitive clarity'),
  perceivedStakes: z.number().min(0).max(100).optional().describe('Perceived stakes'),
  socialSafety: z.number().min(0).max(100).optional().describe('Social safety'),
  moralAlignment: z.number().min(0).max(100).optional().describe('Moral alignment'),
  transformationProgress: z.number().min(0).max(100).optional().describe('Transformation progress'),
  voice: z.union([z.string(), VoiceFingerprintSchema]).optional(),
})

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
  projectId: z.string().uuid().optional().describe('Project ID (required for create/list)'),
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
