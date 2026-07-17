import { z } from 'zod'
import {
  STORYTELLER_CHARACTER_ROLE_VALUES,
} from '@/domains/storyteller/services/constants/storyteller-crud-service'

export const updateCharacterSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(STORYTELLER_CHARACTER_ROLE_VALUES).optional(),
  gender: z.string().optional(),
  characterPrompt: z.string().optional(),
  description: z.string().optional(),
  portraitUrl: z.string().url().optional(),
  stress: z.number().min(0).max(100).optional(),
  trust: z.number().min(0).max(100).optional(),
  power: z.number().min(0).max(100).optional(),
  morality: z.number().min(0).max(100).optional(),
  hope: z.number().min(0).max(100).optional(),
  isolation: z.number().min(0).max(100).optional(),
  transformation: z.number().min(0).max(100).optional(),
  mbti: z.string().optional(),
  voiceSignature: z.string().optional(),
  psychology: z.string().optional(),
})

export type UpdateCharacterInput = z.infer<typeof updateCharacterSchema>
