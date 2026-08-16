import { z } from 'zod'
import { ManageToolOperation } from './manage-tools-wire'

export const BeatDataSchema = z.object({
  logline: z
    .string()
    .min(1)
    .describe('SHORT one-line summary — max 20 words. No clauses stacked with em dashes.'),
  content: z.string().optional().describe('Full beat content/description'),
  visualHook: z
    .string()
    .optional()
    .describe('SHORT iconic visual — one sentence.'),
  beatType: z
    .enum(['setup', 'confrontation', 'resolution', 'transition', 'revelation', 'climax', 'default'])
    .optional()
    .describe('Type of story beat'),
  charactersInvolved: z.array(z.string()).optional().describe('Character names in this beat'),
  emotionalShifts: z
    .record(z.object({ from: z.string(), to: z.string() }))
    .optional()
    .describe('Emotional shifts per character'),
  causalDependencies: z.array(z.string()).optional().describe('Beat IDs this beat depends on'),
  setupsPayoffs: z
    .object({
      setupId: z.string().optional(),
      payoffFor: z.string().optional(),
    })
    .optional()
    .describe('Setup/payoff tracking'),
  actionTaken: z
    .string()
    .min(1)
    .describe('REQUIRED, SHORT: what they did or decided — one sentence. No static description beats.'),
  consequence: z
    .string()
    .min(1)
    .describe('REQUIRED, SHORT: immediate result — one sentence.'),
  storyStateChange: z
    .string()
    .min(1)
    .describe('REQUIRED, SHORT: how the plot shifted — one sentence.'),
})

export const ManageBeatInputSchema = z.object({
  operation: z
    .enum([
      ManageToolOperation.Create,
      ManageToolOperation.Update,
      ManageToolOperation.Delete,
      ManageToolOperation.Get,
      ManageToolOperation.List,
    ])
    .describe('The operation to perform'),
  beatId: z.string().uuid().optional().describe('Beat ID for update/delete/get operations'),
  episodeId: z.string().uuid().optional().describe('Episode ID (required for create)'),
  projectId: z.string().uuid().optional().describe('Project ID for context'),
  sequence: z.number().int().positive().optional().describe('Sequence number for the beat'),
  data: BeatDataSchema.optional().describe('Beat data for create/update (action fields required)'),
})

export const ListBeatsInputSchema = z.object({
  episodeId: z.string().uuid().optional().describe('Filter by episode ID'),
  projectId: z.string().uuid().optional().describe('Filter by project ID'),
  status: z.enum(['proposed', 'approved', 'locked']).optional().describe('Filter by status'),
  includeContent: z.boolean().optional().default(false).describe('Include full content'),
})

export const BeatOutputSchema = z.object({
  id: z.string().uuid(),
  episodeId: z.string().uuid(),
  sequence: z.number(),
  logline: z.string(),
  content: z.string().optional(),
  beatType: z.string(),
  status: z.string(),
  actionTaken: z.string().optional(),
  consequence: z.string().optional(),
  storyStateChange: z.string().optional(),
  visualHook: z.string().optional(),
  charactersInvolved: z.array(z.string()).optional(),
  emotionalShifts: z.record(z.object({ from: z.string(), to: z.string() })).optional(),
  causalDependencies: z.array(z.string()).optional(),
  setupsPayoffs: z.record(z.unknown()).optional(),
})

export const ManageBeatOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
  beat: BeatOutputSchema.optional(),
})

export const ListBeatsOutputSchema = z.object({
  success: z.boolean(),
  beats: z.array(BeatOutputSchema),
  count: z.number(),
})

export type BeatData = z.infer<typeof BeatDataSchema>
