/**
 * Columns a PATCH caller may write on an episode.
 *
 * `id`, `projectId`, `sequence`, `createdAt` and `updatedAt` are deliberately
 * absent. `storyboardUrl` is request-only and merges into `storyPlan`.
 */
import { z } from 'zod'
import { ManuscriptMode } from '@/domains/storyteller/core/types/enums'

export enum EpisodePatchColumnName {
  Title = 'title',
  Summary = 'summary',
  Premise = 'premise',
  ThematicFocus = 'thematicFocus',
  ScriptContent = 'scriptContent',
  ManuscriptMode = 'manuscriptMode',
  MasterPrompt = 'masterPrompt',
  CurrentPhase = 'currentPhase',
  Status = 'status',
  PosterUrl = 'posterUrl',
  PosterPrompt = 'posterPrompt',
  StoryPlan = 'storyPlan',
  PlanApproved = 'planApproved',
  TenPointsPlan = 'tenPointsPlan',
}

export const EPISODE_PATCH_ALLOWED_COLUMNS = [
  EpisodePatchColumnName.Title,
  EpisodePatchColumnName.Summary,
  EpisodePatchColumnName.Premise,
  EpisodePatchColumnName.ThematicFocus,
  EpisodePatchColumnName.ScriptContent,
  EpisodePatchColumnName.ManuscriptMode,
  EpisodePatchColumnName.MasterPrompt,
  EpisodePatchColumnName.CurrentPhase,
  EpisodePatchColumnName.Status,
  EpisodePatchColumnName.PosterUrl,
  EpisodePatchColumnName.PosterPrompt,
  EpisodePatchColumnName.StoryPlan,
  EpisodePatchColumnName.PlanApproved,
  EpisodePatchColumnName.TenPointsPlan,
] as const

export type EpisodePatchColumn = (typeof EPISODE_PATCH_ALLOWED_COLUMNS)[number]

export enum EpisodePatchAlias {
  EpisodePrompt = 'episode_prompt',
  MasterPromptSnake = 'master_prompt',
}

export enum EpisodePatchRequestKey {
  StoryboardUrl = 'storyboardUrl',
}

export const episodePatchRequestSchema = z
  .object({
    title: z.string().optional(),
    summary: z.string().optional(),
    premise: z.record(z.unknown()).optional(),
    thematicFocus: z.string().optional(),
    scriptContent: z.string().optional(),
    manuscriptMode: z.nativeEnum(ManuscriptMode).optional(),
    masterPrompt: z.string().optional(),
    currentPhase: z.string().optional(),
    status: z.string().optional(),
    posterUrl: z.string().optional(),
    posterPrompt: z.string().optional(),
    storyPlan: z.record(z.unknown()).optional(),
    planApproved: z.boolean().optional(),
    tenPointsPlan: z.unknown().optional(),
    [EpisodePatchAlias.EpisodePrompt]: z.string().optional(),
    [EpisodePatchAlias.MasterPromptSnake]: z.string().optional(),
    [EpisodePatchRequestKey.StoryboardUrl]: z.string().optional(),
  })
  .strict()

export type EpisodePatchRequest = z.infer<typeof episodePatchRequestSchema>

export function episodePatchRequestRecord(body: EpisodePatchRequest): Record<string, unknown> {
  const record: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) record[key] = value
  }
  return record
}
