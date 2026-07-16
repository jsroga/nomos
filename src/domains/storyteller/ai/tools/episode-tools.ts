/**
 * Episode Management Tools - GRRM Solo Model
 *
 * Consolidated episode CRUD (merge create+update into manageEpisodeTool).
 */

import '@/shared/data/server-guard'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { episodes } from '@/db/schema'
import { db } from '@/db/client'
import { eq, and, type SQL } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { recordFromJson } from '@/shared/data/deep-merge'

/** jsonb storyPlan column → record, preserving `undefined` when unset. */
function storyPlanRecord(value: unknown): Record<string, unknown> | undefined {
  return value == null ? undefined : recordFromJson(value)
}
import {
  STORYTELLER_PROJECT_ID,
  STORYTELLER_EPISODE_ID,
  requestContextString,
} from '@/domains/storyteller/ai/request-context'

// ==========================================
// SCHEMAS
// ==========================================

const EpisodePremiseSchema = z
  .object({
    logline: z.string().optional().describe('One-sentence episode summary'),
    protagonistHook: z.string().optional().describe('What pulls the protagonist into this episode'),
    antagonistMove: z.string().optional().describe('What the antagonist does to create conflict'),
    fatalFlaw: z.string().optional().describe('How protagonist\'s flaw creates problems'),
    thematicQuestion: z.string().optional().describe('The central question this episode explores'),
  })
  .optional()
  .describe('Episode premise structure')

const EpisodeDataSchema = z.object({
  title: z.string().min(1).describe('Episode title'),
  sequence: z.number().int().positive().optional().describe('Episode number in the series (1-based)'),
  thematicFocus: z.string().optional().describe('Central theme of this episode'),
  premise: EpisodePremiseSchema,
  storyPlan: z.record(z.unknown()).optional().describe('Episode story plan data'),
  thumbnailUrl: z.string().url().optional().describe('Episode thumbnail image'),
})

const ManageEpisodeInputSchema = z.object({
  operation: z.enum(['create', 'update', 'delete', 'get', 'list']).describe('The operation to perform'),
  episodeId: z.string().uuid().optional().describe('Episode ID for update/delete/get operations'),
  projectId: z.string().uuid().optional().describe('Project ID (required for create/list)'),
  data: EpisodeDataSchema.optional().describe('Episode data for create/update'),
})

const ListEpisodesInputSchema = z.object({
  projectId: z.string().uuid().describe('Project ID to filter episodes'),
  sequence: z.number().int().positive().optional().describe('Filter by sequence number'),
})

// ==========================================
// OUTPUT SCHEMAS
// ==========================================

const EpisodeOutputSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string(),
  sequence: z.number(),
  thematicFocus: z.string().optional(),
  premise: z.string().optional(),
  storyPlan: z.record(z.unknown()).optional(),
  thumbnailUrl: z.string().optional(),
})

const ManageEpisodeOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
  episode: EpisodeOutputSchema.optional(),
})

const ListEpisodesOutputSchema = z.object({
  success: z.boolean(),
  episodes: z.array(EpisodeOutputSchema),
  count: z.number(),
})

// ==========================================
// TOOLS
// ==========================================

/**
 * Unified episode management tool
 * Merges create + update operations
 */
export const manageEpisodeTool = createTool({
  id: 'manage_episode',
  description:
    'Create, update, delete, or get an episode. Create requires projectId and title. Update requires episodeId.',
  inputSchema: ManageEpisodeInputSchema,
  outputSchema: ManageEpisodeOutputSchema,
  execute: async (inputData, context) => {
    const { operation, data } = inputData
    // Server-trusted request-context IDs beat model-supplied input.
    const projectId =
      requestContextString(context.requestContext, STORYTELLER_PROJECT_ID) ?? inputData.projectId
    const episodeId =
      requestContextString(context.requestContext, STORYTELLER_EPISODE_ID) ?? inputData.episodeId

    try {
      switch (operation) {
        case 'create': {
          if (!projectId) {
            return {
              success: false,
              error: 'projectId is required for create operation',
            }
          }
          if (!data || !data.title) {
            return {
              success: false,
              error: 'data.title is required for create operation',
            }
          }

          // Get next sequence number if not provided
          let sequence = data.sequence
          if (!sequence) {
            const existing = await db
              .select()
              .from(episodes)
              .where(eq(episodes.projectId, projectId))
            sequence = existing.length + 1
          }

          const newEpisodeId = uuidv4()

          // Prepare storyPlan with premise if provided
          const storyPlanData: Record<string, unknown> = { ...(data.storyPlan ?? {}) }
          if (data.premise) {
            storyPlanData.premise = data.premise
          }

          await db.insert(episodes).values({
            id: newEpisodeId,
            projectId,
            title: data.title,
            sequence,
            thematicFocus: data.thematicFocus ?? null,
            premise: data.premise ? JSON.stringify(data.premise) : null,
            storyPlan: Object.keys(storyPlanData).length > 0 ? storyPlanData : null,
            posterUrl: data.thumbnailUrl ?? null,
          })

          const [created] = await db.select().from(episodes).where(eq(episodes.id, newEpisodeId))

          return {
            success: true,
            message: `Created Episode ${sequence}: "${data.title}"`,
            episode: {
              id: created.id,
              projectId: created.projectId,
              title: created.title,
              sequence: created.sequence,
              thematicFocus: created.thematicFocus ?? undefined,
              premise: created.premise ?? undefined,
              storyPlan: storyPlanRecord(created.storyPlan),
              thumbnailUrl: created.posterUrl ?? undefined,
            },
          }
        }

        case 'update': {
          if (!episodeId) {
            return {
              success: false,
              error: 'episodeId is required for update operation',
            }
          }
          if (!data) {
            return {
              success: false,
              error: 'data is required for update operation',
            }
          }

          const [existing] = await db.select().from(episodes).where(eq(episodes.id, episodeId))

          if (!existing) {
            return {
              success: false,
              error: `Episode ${episodeId} not found`,
            }
          }

          const updateFields: Partial<typeof episodes.$inferInsert> = { updatedAt: new Date() }
          if (data.title !== undefined) updateFields.title = data.title
          if (data.sequence !== undefined) updateFields.sequence = data.sequence
          if (data.thematicFocus !== undefined) updateFields.thematicFocus = data.thematicFocus
          if (data.premise !== undefined) {
            updateFields.premise = JSON.stringify(data.premise)
            // Also update storyPlan.premise
            const currentStoryPlan = recordFromJson(existing.storyPlan)
            updateFields.storyPlan = { ...currentStoryPlan, premise: data.premise }
          }
          if (data.storyPlan !== undefined) {
            const currentStoryPlan = recordFromJson(existing.storyPlan)
            updateFields.storyPlan = { ...currentStoryPlan, ...data.storyPlan }
          }
          if (data.thumbnailUrl !== undefined) updateFields.posterUrl = data.thumbnailUrl

          await db.update(episodes).set(updateFields).where(eq(episodes.id, episodeId))

          const [updated] = await db.select().from(episodes).where(eq(episodes.id, episodeId))

          return {
            success: true,
            message: `Updated episode "${updated.title}"`,
            episode: {
              id: updated.id,
              projectId: updated.projectId,
              title: updated.title,
              sequence: updated.sequence,
              thematicFocus: updated.thematicFocus ?? undefined,
              premise: updated.premise ?? undefined,
              storyPlan: storyPlanRecord(updated.storyPlan),
              thumbnailUrl: updated.posterUrl ?? undefined,
            },
          }
        }

        case 'delete': {
          if (!episodeId) {
            return {
              success: false,
              error: 'episodeId is required for delete operation',
            }
          }

          const [episode] = await db.select().from(episodes).where(eq(episodes.id, episodeId))

          if (!episode) {
            return {
              success: false,
              error: `Episode ${episodeId} not found`,
            }
          }

          await db.delete(episodes).where(eq(episodes.id, episodeId))

          return {
            success: true,
            message: `Deleted episode "${episode.title}"`,
          }
        }

        case 'get': {
          if (!episodeId) {
            return {
              success: false,
              error: 'episodeId is required for get operation',
            }
          }

          const [episode] = await db.select().from(episodes).where(eq(episodes.id, episodeId))

          if (!episode) {
            return {
              success: false,
              error: `Episode ${episodeId} not found`,
            }
          }

          return {
            success: true,
            episode: {
              id: episode.id,
              projectId: episode.projectId,
              title: episode.title,
              sequence: episode.sequence,
              thematicFocus: episode.thematicFocus ?? undefined,
              premise: episode.premise ?? undefined,
              storyPlan: storyPlanRecord(episode.storyPlan),
              thumbnailUrl: episode.posterUrl ?? undefined,
            },
          }
        }

        default:
          return {
            success: false,
            error: `Unknown operation: ${operation}`,
          }
      }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error),
      }
    }
  },
})

/**
 * List episodes for a project
 */
export const listEpisodesTool = createTool({
  id: 'list_episodes',
  description: 'List all episodes in a project, ordered by sequence.',
  inputSchema: ListEpisodesInputSchema,
  outputSchema: ListEpisodesOutputSchema,
  execute: async (inputData, context) => {
    const { sequence } = inputData
    // Server-trusted request-context IDs beat model-supplied input.
    const projectId =
      requestContextString(context.requestContext, STORYTELLER_PROJECT_ID) ?? inputData.projectId

    try {
      const conditions: SQL[] = [eq(episodes.projectId, projectId)]
      if (sequence !== undefined) conditions.push(eq(episodes.sequence, sequence))

      const results = await db
        .select()
        .from(episodes)
        .where(and(...conditions))
        .orderBy(episodes.sequence)

      const formattedEpisodes = results.map(ep => ({
        id: ep.id,
        projectId: ep.projectId,
        title: ep.title,
        sequence: ep.sequence,
        thematicFocus: ep.thematicFocus ?? undefined,
        premise: ep.premise ?? undefined,
        storyPlan: storyPlanRecord(ep.storyPlan),
        thumbnailUrl: ep.posterUrl ?? undefined,
      }))

      return {
        success: true,
        episodes: formattedEpisodes,
        count: formattedEpisodes.length,
      }
    } catch {
      return {
        success: false,
        episodes: [],
        count: 0,
      }
    }
  },
})
