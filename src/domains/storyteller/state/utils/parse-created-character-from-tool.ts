import { CHARACTER_TOOL_ID, ManageToolOperation } from '@/domains/storyteller/ai/tools/manage-tools-wire'
import type { AssistantCompletedToolCall } from '@/shared/chat/assistant/extract-completed-assistant-tool-calls'
import {
  storytellerCharacterFromRow,
  type StorytellerCharacter,
} from '@/domains/storyteller/core/entities/character-wire'
import { fetchStorytellerCharacters } from '@/domains/storyteller/core/io/character.api'
import { clearFetchCache } from '@/shared/data/fetch-cache'
import { recordFromJson, readString } from '@/shared/data/json-guards'

const CHARACTERS_CACHE_KEY_PREFIX = 'characters:'

function isMutatingCharacterOperation(operation: string | undefined): boolean {
  return (
    operation === ManageToolOperation.Create ||
    operation === ManageToolOperation.Update ||
    operation === ManageToolOperation.Delete
  )
}

export function isSuccessfulCharacterMutation(call: AssistantCompletedToolCall): boolean {
  if (call.toolName !== CHARACTER_TOOL_ID) return false
  const result = recordFromJson(call.result)
  if (result.success !== true) return false
  const args = recordFromJson(call.args)
  return isMutatingCharacterOperation(readString(args.operation))
}

export async function syncCharactersAfterManageTool(
  projectId: string,
  setCharacters: (characters: StorytellerCharacter[]) => void,
): Promise<void> {
  clearFetchCache(`${CHARACTERS_CACHE_KEY_PREFIX}${projectId}`)
  try {
    const rows = await fetchStorytellerCharacters(projectId)
    const mapped = rows
      .map(row => storytellerCharacterFromRow(row))
      .filter((character): character is StorytellerCharacter => character !== null)
    setCharacters(mapped)
  } catch {
    // CAST keeps the last list; the next sidebar load retries.
  }
}
