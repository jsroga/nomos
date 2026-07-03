import { z } from 'zod'

// ==========================================
// RESEARCH TOOLS SCHEMAS
// ==========================================

export const ResearchFocusSchema = z.enum([
  'historical',
  'cultural',
  'scientific',
  'psychological',
  'mythology',
  'real_events',
  'genre_conventions',
  'general',
])

export const ResearchInputSchema = z.object({
  query: z.string().describe('The research query - be specific about what you need to know'),
  focus: ResearchFocusSchema.describe('Research focus area to optimize source selection'),
  context: z
    .string()
    .optional()
    .describe('Story context for more relevant results (e.g., "1920s noir detectivestory")'),
  depth: z
    .enum(['quick', 'standard', 'deep'])
    .optional()
    .default('standard')
    .describe('Research depth'),
})

export const FactCheckCategorySchema = z.enum([
  'historical',
  'scientific',
  'cultural',
  'geographical',
])

export const FactCheckInputSchema = z.object({
  claim: z.string().describe('The specific claim or detail to verify'),
  category: FactCheckCategorySchema.describe('Category of the claim'),
})

export const ReferenceLookupInputSchema = z.object({
  term: z.string().describe('The term, name, or concept to look up'),
})

// ==========================================
// STORYTELLING TOOLS SCHEMAS
// ==========================================

export const GetPlotPhaseInputSchema = z.object({
  currentChapter: z.number().int().min(1).describe('Current chapter number'),
})

export const ValidateConsistencyInputSchema = z.object({
  proposedBeat: z.string().describe('The story event being proposed'),
  establishedFacts: z
    .array(z.string())
    .describe('List of established story facts to check against'),
})

