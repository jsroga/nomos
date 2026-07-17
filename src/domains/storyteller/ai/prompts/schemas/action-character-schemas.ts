/** Character action Zod schemas. */
import { z } from 'zod'
// --- Character Development ---

export const CreateCharacterActionSchema = z.object({
  type: z.literal('CREATE_CHARACTER'),
  payload: z.object({
    name: z.string().min(2),
    role: z.string().min(3),
    description: z.string().min(50).nullable().optional().describe('Min 50 chars — include physical details AND personality contradiction.'),
    archetype: z.string().min(3).nullable().optional(),
  }),
})

export const UpdateCharacterProfileActionSchema = z.object({
  type: z.literal('UPDATE_CHARACTER_PROFILE'),
  payload: z.object({
    characterId: z.string(), // or name if ID unknown
    updates: z.object({
      description: z.string().nullable().optional(),
      traits: z.array(z.string()).nullable().optional(),
      voice: z.string().nullable().optional(),
    }),
  }),
})

export const UpdateCharacterRelationshipActionSchema = z.object({
  type: z.literal('UPDATE_CHARACTER_RELATIONSHIP'),
  payload: z.object({
    character1: z.string(),
    character2: z.string(),
    relationshipType: z.string(),
    dynamic: z.string().describe('How they interact now'),
  }),
})

export const SetCharacterGoalActionSchema = z.object({
  type: z.literal('SET_CHARACTER_GOAL'),
  payload: z.object({
    characterId: z.string(),
    goal: z.string(),
    type: z.enum(['abstract', 'concrete']).nullable().optional(),
  }),
})

export const AddCharacterSecretActionSchema = z.object({
  type: z.literal('ADD_CHARACTER_SECRET'),
  payload: z.object({
    characterId: z.string(),
    secret: z.string(),
    stakes: z.string().nullable().optional(),
  }),
})

export const UpdateCharacterArcStatusActionSchema = z.object({
  type: z.literal('UPDATE_CHARACTER_ARC_STATUS'),
  payload: z.object({
    characterId: z.string(),
    status: z.string().describe('e.g., "Resisting the Call", "Dark Night of the Soul"'),
    progress: z.number().min(0).max(100).nullable().optional(),
  }),
})

export const ArchiveCharacterActionSchema = z.object({
  type: z.literal('ARCHIVE_CHARACTER'),
  payload: z.object({
    characterId: z.string(),
    reason: z.string(),
  }),
})

export const CastCharacterActionSchema = z.object({
  type: z.literal('CAST_CHARACTER'),
  payload: z.object({
    characterId: z.string(),
    actorArchetype: z.string(),
    visualNotes: z.string().nullable().optional(),
  }),
})
