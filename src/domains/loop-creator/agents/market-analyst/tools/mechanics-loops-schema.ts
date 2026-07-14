import { z } from 'zod'

const mechanicFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
})

export const mechanicsLoopsToolSchema = z.object({
  mechanics: z.array(mechanicFieldSchema).describe('Game mechanics to analyze'),
  loops: z.array(mechanicFieldSchema).optional().describe('Game loops if defined'),
  gameDescription: z.string().optional().describe('Overall game description'),
})

export const mechanicsLoopsWithGenreSchema = mechanicsLoopsToolSchema.extend({
  gameGenre: z.string().optional().describe('Target game genre'),
})
