/**
 * Beat Management Tools - GRRM Solo Model
 */

import '@/shared/data/server-guard'
import { createTool } from '@mastra/core/tools'
import { beats } from '@/db/schema'
import { db } from '@/db/client'
import { eq, and, type SQL } from 'drizzle-orm'
import { getErrorMessage } from '@/shared/errors/error-utils'
import {
  STORYTELLER_EPISODE_ID,
  requestContextString,
} from '@/domains/storyteller/ai/request-context'
import {
  ListBeatsInputSchema,
  ListBeatsOutputSchema,
  ManageBeatInputSchema,
  ManageBeatOutputSchema,
} from './beat-tools-schema'
import {
  beatResponse,
  createBeatOperation,
  deleteBeatOperation,
  getBeatOperation,
  updateBeatOperation,
} from './beat-tool-operations'
import {
  BEAT_CREATE_DATA_REQUIRED,
  BEAT_CREATE_EPISODE_ID_REQUIRED,
  BEAT_DELETE_ID_REQUIRED,
  BEAT_GET_ID_REQUIRED,
  BEAT_TOOL_ID,
  BEAT_TOOL_LIST_DESC,
  BEAT_UPDATE_DATA_REQUIRED,
  BEAT_UPDATE_ID_REQUIRED,
  LIST_BEATS_TOOL_ID,
  ManageToolOperation,
} from './manage-tools-wire'

async function dispatchBeatOperation(
  operation: (typeof ManageToolOperation)[keyof typeof ManageToolOperation],
  beatId: string | undefined,
  episodeId: string | undefined,
  sequence: number | undefined,
  data: Parameters<typeof createBeatOperation>[2] | undefined,
) {
  switch (operation) {
    case ManageToolOperation.Create: {
      if (!episodeId) return { success: false, error: BEAT_CREATE_EPISODE_ID_REQUIRED }
      if (!data) return { success: false, error: BEAT_CREATE_DATA_REQUIRED }
      return createBeatOperation(episodeId, sequence, data)
    }
    case ManageToolOperation.Update: {
      if (!beatId) return { success: false, error: BEAT_UPDATE_ID_REQUIRED }
      if (!data) return { success: false, error: BEAT_UPDATE_DATA_REQUIRED }
      return updateBeatOperation(beatId, data)
    }
    case ManageToolOperation.Delete: {
      if (!beatId) return { success: false, error: BEAT_DELETE_ID_REQUIRED }
      return deleteBeatOperation(beatId)
    }
    case ManageToolOperation.Get: {
      if (!beatId) return { success: false, error: BEAT_GET_ID_REQUIRED }
      return getBeatOperation(beatId)
    }
    default:
      return { success: false, error: `Unknown operation: ${operation}` }
  }
}

export const manageBeatTool = createTool({
  id: BEAT_TOOL_ID,
  description:
    'Create, update, delete, or get a story beat. CREATE/UPDATE REQUIRE actionTaken, consequence, storyStateChange (Law of Motion: every beat must move action forward).',
  inputSchema: ManageBeatInputSchema,
  outputSchema: ManageBeatOutputSchema,
  execute: async (inputData, context) => {
    const { operation, beatId, sequence, data } = inputData
    const episodeId =
      requestContextString(context.requestContext, STORYTELLER_EPISODE_ID) ?? inputData.episodeId

    try {
      return await dispatchBeatOperation(operation, beatId, episodeId, sequence, data)
    } catch (error) {
      return { success: false, error: getErrorMessage(error) }
    }
  },
})

export const listBeatsTool = createTool({
  id: LIST_BEATS_TOOL_ID,
  description: BEAT_TOOL_LIST_DESC,
  inputSchema: ListBeatsInputSchema,
  outputSchema: ListBeatsOutputSchema,
  execute: async (inputData, context) => {
    const { status, includeContent } = inputData
    const episodeId =
      requestContextString(context.requestContext, STORYTELLER_EPISODE_ID) ?? inputData.episodeId

    try {
      const conditions: SQL[] = []
      if (episodeId) conditions.push(eq(beats.episodeId, episodeId))
      if (status) conditions.push(eq(beats.status, status))

      const results = await db
        .select()
        .from(beats)
        .where(conditions.length > 0 ? and(...conditions) : undefined)

      const formattedBeats = results.map(beat => {
        const response = beatResponse(beat)
        if (!includeContent) {
          delete response.content
        }
        return response
      })

      return { success: true, beats: formattedBeats, count: formattedBeats.length }
    } catch {
      return { success: false, beats: [], count: 0 }
    }
  },
})
