/**
 * Character Management Tools - GRRM Solo Model
 *
 * Consolidated character CRUD (merge create+update into manageCharacterTool).
 */

import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { characters } from '@/db/schema'
import { db } from '@/db/client'
import { eq, and } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { getErrorMessage } from '@/shared/errors/error-utils'

// ==========================================
// SCHEMAS
// ==========================================

const CharacterPsychologySchema = z
  .object({
    archetype: z.string().optional(),
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

const CharacterDataSchema = z.object({
  name: z.string().min(1).describe('Character name'),
  role: z
    .enum(['Protagonist', 'Antagonist', 'Supporting', 'Background', 'Lead'])
    .optional()
    .describe('Character role in the story'),
  description: z.string().optional().describe('Physical and personality description'),
  shortDescription: z.string().optional().describe('Brief one-line description'),
  gender: z.string().optional().describe('Gender identity'),
  mbti: z.string().optional().describe('MBTI personality type'),
  voiceSignature: z.string().optional().describe('Distinctive speaking style'),
  portraitUrl: z.string().url().optional().describe('Character portrait image URL'),
  characterPrompt: z.string().optional().describe('Internal character prompt'),
  psychology: CharacterPsychologySchema,
  // Metrics
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
})

const ManageCharacterInputSchema = z.object({
  operation: z.enum(['create', 'update', 'delete', 'get', 'list']).describe('The operation to perform'),
  characterId: z.string().uuid().optional().describe('Character ID for update/delete/get operations'),
  projectId: z.string().uuid().optional().describe('Project ID (required for create/list)'),
  data: CharacterDataSchema.optional().describe('Character data for create/update'),
})

const ListCharactersInputSchema = z.object({
  projectId: z.string().uuid().describe('Project ID to filter characters'),
  role: z
    .enum(['Protagonist', 'Antagonist', 'Supporting', 'Background', 'Lead'])
    .optional()
    .describe('Filter by role'),
})

// ==========================================
// OUTPUT SCHEMAS
// ==========================================

const CharacterOutputSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
  role: z.string(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  gender: z.string().optional(),
  mbti: z.string().optional(),
  voiceSignature: z.string().optional(),
  portraitUrl: z.string().optional(),
  psychology: z.record(z.unknown()).optional(),
  valence: z.number().optional(),
  arousal: z.number().optional(),
  autonomy: z.number().optional(),
  competence: z.number().optional(),
  relatedness: z.number().optional(),
})

const ManageCharacterOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
  character: CharacterOutputSchema.optional(),
})

const ListCharactersOutputSchema = z.object({
  success: z.boolean(),
  characters: z.array(CharacterOutputSchema),
  count: z.number(),
})

// ==========================================
// TOOLS
// ==========================================

/**
 * Unified character management tool
 * Merges create + update operations
 */
export const manageCharacterTool = createTool({
  id: 'manage_character',
  description:
    'Create, update, delete, or get a character. Create requires projectId and name. Update requires characterId.',
  inputSchema: ManageCharacterInputSchema,
  outputSchema: ManageCharacterOutputSchema,
  execute: async (inputData, context) => {
    const { operation, characterId, projectId, data } = inputData

    try {
      switch (operation) {
        case 'create': {
          if (!projectId) {
            return {
              success: false,
              error: 'projectId is required for create operation',
            }
          }
          if (!data || !data.name) {
            return {
              success: false,
              error: 'data.name is required for create operation',
            }
          }

          // Check if character already exists
          const existing = await db
            .select()
            .from(characters)
            .where(and(eq(characters.projectId, projectId), eq(characters.name, data.name)))
            .limit(1)

          if (existing.length > 0) {
            return {
              success: false,
              error: `Character "${data.name}" already exists in this project`,
            }
          }

          const newCharacterId = uuidv4()

          await db.insert(characters).values({
            id: newCharacterId,
            projectId,
            name: data.name,
            role: data.role ?? 'Supporting',
            description: data.shortDescription ?? data.description ?? null,
            gender: data.gender ?? null,
            mbti: data.mbti ?? null,
            voiceSignature: data.voiceSignature ?? null,
            portraitUrl: data.portraitUrl ?? null,
            characterPrompt: data.characterPrompt ?? null,
            psychology: data.psychology ?? null,
            valence: data.valence ?? 0,
            arousal: data.arousal ?? 50,
            autonomy: data.autonomy ?? 60,
            competence: data.competence ?? 60,
            relatedness: data.relatedness ?? 50,
            cognitiveClarity: data.cognitiveClarity ?? 70,
            perceivedStakes: data.perceivedStakes ?? 40,
            socialSafety: data.socialSafety ?? 60,
            moralAlignment: data.moralAlignment ?? 70,
            transformationProgress: data.transformationProgress ?? 0,
          })

          const [created] = await db.select().from(characters).where(eq(characters.id, newCharacterId))

          return {
            success: true,
            message: `Created character "${data.name}" (${data.role ?? 'Supporting'})`,
            character: {
              id: created.id,
              projectId: created.projectId,
              name: created.name,
              role: created.role,
              description: created.description ?? undefined,
              shortDescription: created.description ?? undefined,
              gender: created.gender ?? undefined,
              mbti: created.mbti ?? undefined,
              voiceSignature: created.voiceSignature ?? undefined,
              portraitUrl: created.portraitUrl ?? undefined,
              psychology: (created.psychology as any) ?? undefined,
              valence: created.valence,
              arousal: created.arousal,
              autonomy: created.autonomy,
              competence: created.competence,
              relatedness: created.relatedness,
            },
          }
        }

        case 'update': {
          if (!characterId) {
            return {
              success: false,
              error: 'characterId is required for update operation',
            }
          }
          if (!data) {
            return {
              success: false,
              error: 'data is required for update operation',
            }
          }

          const [existing] = await db.select().from(characters).where(eq(characters.id, characterId))

          if (!existing) {
            return {
              success: false,
              error: `Character ${characterId} not found`,
            }
          }

          const updateFields: any = { updatedAt: new Date() }
          if (data.name !== undefined) updateFields.name = data.name
          if (data.role !== undefined) updateFields.role = data.role
          if (data.description !== undefined) updateFields.description = data.description
          if (data.shortDescription !== undefined) updateFields.description = data.shortDescription
          if (data.description !== undefined) updateFields.description = data.description
          if (data.gender !== undefined) updateFields.gender = data.gender
          if (data.mbti !== undefined) updateFields.mbti = data.mbti
          if (data.voiceSignature !== undefined) updateFields.voiceSignature = data.voiceSignature
          if (data.portraitUrl !== undefined) updateFields.portraitUrl = data.portraitUrl
          if (data.characterPrompt !== undefined) updateFields.characterPrompt = data.characterPrompt
          if (data.psychology !== undefined) {
            // Merge psychology deeply
            const currentPsych = (existing.psychology as any) ?? {}
            updateFields.psychology = { ...currentPsych, ...data.psychology }
          }
          if (data.valence !== undefined) updateFields.valence = data.valence
          if (data.arousal !== undefined) updateFields.arousal = data.arousal
          if (data.autonomy !== undefined) updateFields.autonomy = data.autonomy
          if (data.competence !== undefined) updateFields.competence = data.competence
          if (data.relatedness !== undefined) updateFields.relatedness = data.relatedness
          if (data.cognitiveClarity !== undefined) updateFields.cognitiveClarity = data.cognitiveClarity
          if (data.perceivedStakes !== undefined) updateFields.perceivedStakes = data.perceivedStakes
          if (data.socialSafety !== undefined) updateFields.socialSafety = data.socialSafety
          if (data.moralAlignment !== undefined) updateFields.moralAlignment = data.moralAlignment
          if (data.transformationProgress !== undefined)
            updateFields.transformationProgress = data.transformationProgress

          await db.update(characters).set(updateFields).where(eq(characters.id, characterId))

          const [updated] = await db.select().from(characters).where(eq(characters.id, characterId))

          return {
            success: true,
            message: `Updated character "${updated.name}"`,
            character: {
              id: updated.id,
              projectId: updated.projectId,
              name: updated.name,
              role: updated.role,
              description: updated.description ?? undefined,
              shortDescription: updated.description ?? undefined,
              gender: updated.gender ?? undefined,
              mbti: updated.mbti ?? undefined,
              voiceSignature: updated.voiceSignature ?? undefined,
              portraitUrl: updated.portraitUrl ?? undefined,
              psychology: (updated.psychology as any) ?? undefined,
              valence: updated.valence,
              arousal: updated.arousal,
              autonomy: updated.autonomy,
              competence: updated.competence,
              relatedness: updated.relatedness,
            },
          }
        }

        case 'delete': {
          if (!characterId) {
            return {
              success: false,
              error: 'characterId is required for delete operation',
            }
          }

          const [character] = await db.select().from(characters).where(eq(characters.id, characterId))

          if (!character) {
            return {
              success: false,
              error: `Character ${characterId} not found`,
            }
          }

          await db.delete(characters).where(eq(characters.id, characterId))

          return {
            success: true,
            message: `Deleted character "${character.name}"`,
          }
        }

        case 'get': {
          if (!characterId) {
            return {
              success: false,
              error: 'characterId is required for get operation',
            }
          }

          const [character] = await db.select().from(characters).where(eq(characters.id, characterId))

          if (!character) {
            return {
              success: false,
              error: `Character ${characterId} not found`,
            }
          }

          return {
            success: true,
            character: {
              id: character.id,
              projectId: character.projectId,
              name: character.name,
              role: character.role,
              description: character.description ?? undefined,
              shortDescription: character.description ?? undefined,
              gender: character.gender ?? undefined,
              mbti: character.mbti ?? undefined,
              voiceSignature: character.voiceSignature ?? undefined,
              portraitUrl: character.portraitUrl ?? undefined,
              psychology: (character.psychology as any) ?? undefined,
              valence: character.valence,
              arousal: character.arousal,
              autonomy: character.autonomy,
              competence: character.competence,
              relatedness: character.relatedness,
            },
          }
        }

        default:
          return {
            success: false,
            error: `Unknown operation: ${operation}`,
          }
      }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error),
      }
    }
  },
})

/**
 * List characters for a project
 */
export const listCharactersTool = createTool({
  id: 'list_characters',
  description: 'List all characters in a project, optionally filtered by role.',
  inputSchema: ListCharactersInputSchema,
  outputSchema: ListCharactersOutputSchema,
  execute: async (inputData, context) => {
    const { projectId, role } = inputData

    try {
      const conditions: any[] = [eq(characters.projectId, projectId)]
      if (role) conditions.push(eq(characters.role, role))

      const results = await db
        .select()
        .from(characters)
        .where(and(...conditions))

      const formattedCharacters = results.map(char => ({
        id: char.id,
        projectId: char.projectId,
        name: char.name,
        role: char.role,
        description: char.description ?? undefined,
        shortDescription: char.description ?? undefined,
        gender: char.gender ?? undefined,
        mbti: char.mbti ?? undefined,
        voiceSignature: char.voiceSignature ?? undefined,
        portraitUrl: char.portraitUrl ?? undefined,
        psychology: (char.psychology as any) ?? undefined,
        valence: char.valence,
        arousal: char.arousal,
        autonomy: char.autonomy,
        competence: char.competence,
        relatedness: char.relatedness,
      }))

      return {
        success: true,
        characters: formattedCharacters,
        count: formattedCharacters.length,
      }
    } catch (error) {
      return {
        success: false,
        characters: [],
        count: 0,
      }
    }
  },
})
