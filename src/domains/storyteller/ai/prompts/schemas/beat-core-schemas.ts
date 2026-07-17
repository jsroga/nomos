/** Beat, world-rule, and faction Zod schemas for storyteller agents. */
import { z } from 'zod'

// ============================================
// MAZUR ELEMENTS SCHEMA
// ============================================

export const MazurElementsSchema = z.object({
  character: z
    .string()
    .nullable()
    .describe('Specific trait revealed - be harsh, be honest about who they really are'),
  object: z.string().nullable().describe('A SPECIFIC physical object with symbolic weight'),
  coreConcept: z.string().nullable().describe('Theme reinforcement - be philosophical'),
  attribute: z.string().nullable().describe('Sensory detail - smell, taste, texture, sound'),
  action: z
    .string()
    .nullable()
    .describe('ACTIVE VERB - not \'decides\' but \'rips\', \'slams\', \'whispers\''),
  method: z.string().nullable().describe('The HOW reveals WHO - how they do it'),
  setting: z
    .string()
    .nullable()
    .describe('Environment as metaphor - the space reflects the psyche'),
  timeframe: z.string().nullable().describe('Specific time pressure'),
  motivation: z.string().nullable().describe('The ugly truth of WHY - the real motivation'),
  tone: z.string().nullable().describe('Specific atmosphere'),
})

// ============================================
// BEAT SCHEMAS
// ============================================

export const WorldRuleSchema = z.object({
  category: z.enum(['Physics', 'Magic', 'Technology', 'Society', 'Politics', 'Economics']),
  rule: z.string().min(15).describe('The rule itself — be specific, not vague. Min 15 chars.'),
  consequence: z.string().min(15).describe('What happens if this rule is broken or ignored — concrete consequence. Min 15 chars.'),
  exceptions: z.string().nullable().optional().describe('Are there exceptions?'),
})

export const FactionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  description: z.string().min(30).describe('Brief summary of the faction — be specific about what makes them unique. Min 30 chars.'),
  ideology: z.string().min(10).describe('Core belief or philosophy — not just "power" or "justice". Min 10 chars.'),
  goals: z.array(z.string().min(10)).describe('What they want — each goal must be specific'),
  resources: z.string().min(10).describe('What power/assets they control'),
  weaknesses: z.string().min(10).nullable().optional(),
  rivals: z.array(z.string()).nullable().optional(),
})

export type WorldRule = z.infer<typeof WorldRuleSchema>
export type Faction = z.infer<typeof FactionSchema>

export const ItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  description: z.string().min(20).describe('Description of the item, its history, or its unique properties. Min 20 chars.'),
})

export const EventSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  description: z.string().min(20).describe('Description of the event, its impact, and its legacy. Min 20 chars.'),
})

export type Item = z.infer<typeof ItemSchema>
export type StoryEvent = z.infer<typeof EventSchema>

export const BeatTypeSchema = z.enum([
  'setup',
  'complication',
  'revelation',
  'decision',
  'consequence',
  'conflict_escalation',
  'faction_move',
  'world_event',
])

export const BeatProposalSchema = z.object({
  logline: z
    .string()
    .min(30)
    .describe('2-3 sentences. Be specific. Name names. Include visceral details. Min 30 chars.'),
  content: z.string().min(50).nullable().optional().describe('Full paragraph expanding on the beat. Min 50 chars when provided.'),
  beatType: BeatTypeSchema.nullable().optional().describe('Type of beat in story structure'),
  charactersInvolved: z
    .array(z.string())
    .nullable()
    .optional()
    .describe('Character names involved'),
  visualHook: z.string().min(15).nullable().optional().describe('A SPECIFIC, MEMORABLE image. Min 15 chars — no generic descriptions.'),
  emotionalShifts: z
    .array(
      z.object({
        characterName: z.string(),
        emotionalShift: z.string(),
      })
    )
    .nullable()
    .optional()
    .describe('Character emotional transitions'),
  mazurElements: MazurElementsSchema.nullable().optional(),
})
