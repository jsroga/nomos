import { z } from 'zod'

export const storytellerEpisodesQuerySchema = z.object({
  projectId: z.string().min(1),
})

export const storytellerCreateEpisodeRequestSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(1),
  sequence: z.number().int().positive(),
  masterPrompt: z.string().optional(),
  summary: z.string().optional(),
})

export const storytellerEpisodeListItemSchema = z
  .object({
    id: z.string(),
    title: z.string().nullable().optional(),
    sequence: z.number().nullable().optional(),
  })
  .passthrough()

export const storytellerEpisodesResponseSchema = z.array(storytellerEpisodeListItemSchema)

export const storytellerEpisodeResponseSchema = z
  .object({
    id: z.string(),
    title: z.string().nullable().optional(),
    masterPrompt: z.string().nullable().optional(),
  })
  .passthrough()

export const storytellerBibleLockQuerySchema = z.object({
  projectId: z.string().min(1),
})

export const storytellerBibleLockResponseSchema = z.object({
  isLocked: z.boolean(),
  lockedBy: z.string().nullable(),
  lockedAt: z.string().nullable(),
})

export type StorytellerEpisodeListItem = z.infer<typeof storytellerEpisodeListItemSchema>
export type StorytellerEpisodeResponse = z.infer<typeof storytellerEpisodeResponseSchema>
export type StorytellerBibleLockResponse = z.infer<typeof storytellerBibleLockResponseSchema>
