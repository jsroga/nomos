/**
 * Episode Management Tools - GRRM Solo Model
 */

import '@/shared/data/server-guard'
import { createTool } from '@mastra/core/tools'
import { episodes } from '@/db/schema'
import { db } from '@/db/client'
import { eq, and, type SQL } from 'drizzle-orm'
import { getErrorMessage } from '@/shared/errors/error-utils'
import {
  STORYTELLER_PROJECT_ID,
  STORYTELLER_EPISODE_ID,
  requestContextString,
} from '@/domains/storyteller/ai/request-context'
import {
  ListEpisodesInputSchema,
  ListEpisodesOutputSchema,
  ManageEpisodeInputSchema,
  ManageEpisodeOutputSchema,
} from './episode-tools-schema'
import {
  createEpisodeOperation,
  deleteEpisodeOperation,
  episodeResponse,
  getEpisodeOperation,
  updateEpisodeOperation,
} from './episode-tool-operations'
import {
  EPISODE_CREATE_PROJECT_ID_REQUIRED,
  EPISODE_CREATE_TITLE_REQUIRED,
  EPISODE_DELETE_ID_REQUIRED,
  EPISODE_GET_ID_REQUIRED,
  EPISODE_TOOL_DESC,
  EPISODE_TOOL_ID,
  EPISODE_UPDATE_DATA_REQUIRED,
  EPISODE_UPDATE_ID_REQUIRED,
  LIST_EPISODES_TOOL_DESC,
  LIST_EPISODES_TOOL_ID,
  LIST_PROJECT_ID_REQUIRED,
  ManageToolOperation,
} from './manage-tools-wire'

async function dispatchEpisodeOperation(
  operation: (typeof ManageToolOperation)[keyof typeof ManageToolOperation],
  episodeId: string | undefined,
  projectId: string | undefined,
  data: Parameters<typeof createEpisodeOperation>[1] | undefined,
) {
  switch (operation) {
    case ManageToolOperation.Create: {
      if (!projectId) return { success: false, error: EPISODE_CREATE_PROJECT_ID_REQUIRED }
      if (!data || !data.title) return { success: false, error: EPISODE_CREATE_TITLE_REQUIRED }
      return createEpisodeOperation(projectId, data)
    }
    case ManageToolOperation.Update: {
      if (!episodeId) return { success: false, error: EPISODE_UPDATE_ID_REQUIRED }
      if (!data) return { success: false, error: EPISODE_UPDATE_DATA_REQUIRED }
      return updateEpisodeOperation(episodeId, data)
    }
    case ManageToolOperation.Delete: {
      if (!episodeId) return { success: false, error: EPISODE_DELETE_ID_REQUIRED }
      return deleteEpisodeOperation(episodeId)
    }
    case ManageToolOperation.Get: {
      if (!episodeId) return { success: false, error: EPISODE_GET_ID_REQUIRED }
      return getEpisodeOperation(episodeId)
    }
    default:
      return { success: false, error: `Unknown operation: ${operation}` }
  }
}

export const manageEpisodeTool = createTool({
  id: EPISODE_TOOL_ID,
  description: EPISODE_TOOL_DESC,
  inputSchema: ManageEpisodeInputSchema,
  outputSchema: ManageEpisodeOutputSchema,
  execute: async (inputData, context) => {
    const { operation, data } = inputData
    const projectId =
      requestContextString(context.requestContext, STORYTELLER_PROJECT_ID) ?? inputData.projectId
    const episodeId =
      requestContextString(context.requestContext, STORYTELLER_EPISODE_ID) ?? inputData.episodeId

    try {
      return await dispatchEpisodeOperation(operation, episodeId, projectId, data)
    } catch (error) {
      return { success: false, error: getErrorMessage(error) }
    }
  },
})

export const listEpisodesTool = createTool({
  id: LIST_EPISODES_TOOL_ID,
  description: LIST_EPISODES_TOOL_DESC,
  inputSchema: ListEpisodesInputSchema,
  outputSchema: ListEpisodesOutputSchema,
  execute: async (inputData, context) => {
    const { sequence } = inputData
    const projectId =
      requestContextString(context.requestContext, STORYTELLER_PROJECT_ID) ?? inputData.projectId

    try {
      if (!projectId) {
        return { success: false, episodes: [], count: 0, error: LIST_PROJECT_ID_REQUIRED }
      }
      const conditions: SQL[] = [eq(episodes.projectId, projectId)]
      if (sequence !== undefined) conditions.push(eq(episodes.sequence, sequence))

      const results = await db
        .select()
        .from(episodes)
        .where(and(...conditions))
        .orderBy(episodes.sequence)

      return {
        success: true,
        episodes: results.map(ep => episodeResponse(ep)),
        count: results.length,
      }
    } catch {
      return { success: false, episodes: [], count: 0 }
    }
  },
})
