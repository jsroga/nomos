/**
 * Character Management Tools - GRRM Solo Model
 */

import '@/shared/data/server-guard'
import { createTool } from '@mastra/core/tools'
import { characters } from '@/db/schema'
import { db } from '@/db/client'
import { eq, and, type SQL } from 'drizzle-orm'
import { getErrorMessage } from '@/shared/errors/error-utils'
import {
  STORYTELLER_PROJECT_ID,
  requestContextString,
} from '@/domains/storyteller/ai/request-context'
import {
  ListCharactersInputSchema,
  ListCharactersOutputSchema,
  ManageCharacterInputSchema,
  ManageCharacterOutputSchema,
} from './character-tools-schema'
import {
  characterResponse,
  createCharacterOperation,
  deleteCharacterOperation,
  getCharacterOperation,
  updateCharacterOperation,
} from './character-tool-operations'
import {
  CHARACTER_CREATE_NAME_REQUIRED,
  CHARACTER_CREATE_PROJECT_ID_REQUIRED,
  CHARACTER_DELETE_ID_REQUIRED,
  CHARACTER_GET_ID_REQUIRED,
  CHARACTER_TOOL_DESC,
  CHARACTER_TOOL_ID,
  CHARACTER_UPDATE_DATA_REQUIRED,
  CHARACTER_UPDATE_ID_REQUIRED,
  LIST_CHARACTERS_TOOL_DESC,
  LIST_CHARACTERS_TOOL_ID,
  LIST_PROJECT_ID_REQUIRED,
  ManageToolOperation,
} from './manage-tools-wire'

async function dispatchCharacterOperation(
  operation: (typeof ManageToolOperation)[keyof typeof ManageToolOperation],
  characterId: string | undefined,
  projectId: string | undefined,
  data: Parameters<typeof createCharacterOperation>[1] | undefined,
) {
  switch (operation) {
    case ManageToolOperation.Create: {
      if (!projectId) return { success: false, error: CHARACTER_CREATE_PROJECT_ID_REQUIRED }
      if (!data || !data.name) return { success: false, error: CHARACTER_CREATE_NAME_REQUIRED }
      return createCharacterOperation(projectId, data)
    }
    case ManageToolOperation.Update: {
      if (!characterId) return { success: false, error: CHARACTER_UPDATE_ID_REQUIRED }
      if (!data) return { success: false, error: CHARACTER_UPDATE_DATA_REQUIRED }
      return updateCharacterOperation(characterId, data)
    }
    case ManageToolOperation.Delete: {
      if (!characterId) return { success: false, error: CHARACTER_DELETE_ID_REQUIRED }
      return deleteCharacterOperation(characterId)
    }
    case ManageToolOperation.Get: {
      if (!characterId) return { success: false, error: CHARACTER_GET_ID_REQUIRED }
      return getCharacterOperation(characterId)
    }
    default:
      return { success: false, error: `Unknown operation: ${operation}` }
  }
}

export const manageCharacterTool = createTool({
  id: CHARACTER_TOOL_ID,
  description: CHARACTER_TOOL_DESC,
  inputSchema: ManageCharacterInputSchema,
  outputSchema: ManageCharacterOutputSchema,
  execute: async (inputData, context) => {
    const { operation, characterId, data } = inputData
    const projectId =
      requestContextString(context.requestContext, STORYTELLER_PROJECT_ID) ?? inputData.projectId

    try {
      return await dispatchCharacterOperation(operation, characterId, projectId, data)
    } catch (error) {
      return { success: false, error: getErrorMessage(error) }
    }
  },
})

export const listCharactersTool = createTool({
  id: LIST_CHARACTERS_TOOL_ID,
  description: LIST_CHARACTERS_TOOL_DESC,
  inputSchema: ListCharactersInputSchema,
  outputSchema: ListCharactersOutputSchema,
  execute: async (inputData, context) => {
    const { role } = inputData
    const projectId =
      requestContextString(context.requestContext, STORYTELLER_PROJECT_ID) ?? inputData.projectId

    try {
      if (!projectId) {
        return { success: false, characters: [], count: 0, error: LIST_PROJECT_ID_REQUIRED }
      }
      const conditions: SQL[] = [eq(characters.projectId, projectId)]
      if (role) conditions.push(eq(characters.role, role))

      const results = await db
        .select()
        .from(characters)
        .where(and(...conditions))

      return {
        success: true,
        characters: results.map(char => characterResponse(char)),
        count: results.length,
      }
    } catch {
      return { success: false, characters: [], count: 0 }
    }
  },
})
