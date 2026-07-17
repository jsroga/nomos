import { z } from 'zod'
import { ManageToolOperation } from './manage-tools-wire'

export const EpisodePremiseSchema = z
  .object({
    logline: z.string().optional().describe('One-sentence episode summary'),
    protagonistHook: z.string().optional().describe('What pulls the protagonist into this episode'),
    antagonistMove: z.string().optional().describe('What the antagonist does to create conflict'),
    fatalFlaw: z.string().optional().describe('How protagonist flaw creates problems'),
    thematicQuestion: z.string().optional().describe('The central question this episode explores'),
  })
  .optional()
  .describe('Episode premise structure')

export const EpisodeDataSchema = z.object({
  title: z.string().min(1).describe('Episode title'),
  sequence: z.number().int().positive().optional().describe('Episode number in the series (1-based)'),
  thematicFocus: z.string().optional().describe('Central theme of this episode'),
  premise: EpisodePremiseSchema,
  storyPlan: z.record(z.unknown()).optional().describe('Episode story plan data'),
  thumbnailUrl: z.string().url().optional().describe('Episode thumbnail image'),
})

export const ManageEpisodeInputSchema = z.object({
  operation: z
    .enum([
      ManageToolOperation.Create,
      ManageToolOperation.Update,
      ManageToolOperation.Delete,
      ManageToolOperation.Get,
      ManageToolOperation.List,
    ])
    .describe('The operation to perform'),
  episodeId: z.string().uuid().optional().describe('Episode ID for update/delete/get operations'),
  projectId: z.string().uuid().optional().describe('Project ID (required for create/list)'),
  data: EpisodeDataSchema.optional().describe('Episode data for create/update'),
})

export const ListEpisodesInputSchema = z.object({
  projectId: z.string().uuid().describe('Project ID to filter episodes'),
  sequence: z.number().int().positive().optional().describe('Filter by sequence number'),
})

export const EpisodeOutputSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string(),
  sequence: z.number(),
  thematicFocus: z.string().optional(),
  premise: z.string().optional(),
  storyPlan: z.record(z.unknown()).optional(),
  thumbnailUrl: z.string().optional(),
})

export const ManageEpisodeOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
  episode: EpisodeOutputSchema.optional(),
})

export const ListEpisodesOutputSchema = z.object({
  success: z.boolean(),
  episodes: z.array(EpisodeOutputSchema),
  count: z.number(),
})

export type EpisodeData = z.infer<typeof EpisodeDataSchema>
