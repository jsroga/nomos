import { z } from 'zod'
import type { WorkspaceProject } from '../types'

const dateLikeSchema = z.union([z.string(), z.date()]).transform(value => {
  if (value instanceof Date) return value.toISOString()
  return value
})

export const workspaceProjectResponseSchema = z
  .object({
    id: z.string().uuid(),
    userId: z.string().uuid().optional(),
    user_id: z.string().uuid().optional(),
    name: z.string(),
    masterPrompt: z.string().nullable().optional(),
    master_prompt: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    seriesBible: z.record(z.unknown()).nullable().optional(),
    series_bible: z.record(z.unknown()).nullable().optional(),
    storyPlan: z.record(z.unknown()).nullable().optional(),
    story_plan: z.record(z.unknown()).nullable().optional(),
    stylePreset: z.string().nullable().optional(),
    style_preset: z.string().nullable().optional(),
    generationMode: z.string().nullable().optional(),
    generation_mode: z.string().nullable().optional(),
    createdAt: dateLikeSchema.optional(),
    created_at: dateLikeSchema.optional(),
  })
  .passthrough()
  .transform(row => ({
    id: row.id,
    userId: row.userId ?? row.user_id,
    name: row.name,
    masterPrompt: row.masterPrompt ?? row.master_prompt ?? '',
    description: row.description ?? null,
    seriesBible: row.seriesBible ?? row.series_bible ?? {},
    storyPlan: row.storyPlan ?? row.story_plan ?? {},
    stylePreset: row.stylePreset ?? row.style_preset ?? null,
    generationMode: row.generationMode ?? row.generation_mode ?? null,
    createdAt: row.createdAt ?? row.created_at,
  }))

export function toWorkspaceProject(row: z.infer<typeof workspaceProjectResponseSchema>): WorkspaceProject {
  return {
    id: row.id,
    name: row.name,
    user_id: row.userId,
    master_prompt: row.masterPrompt,
    series_bible: row.seriesBible,
    story_plan: row.storyPlan,
    stylePreset: row.stylePreset,
    generationMode: row.generationMode,
    description: row.description,
    created_at: row.createdAt,
  }
}
