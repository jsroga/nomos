/**
 * Parse manage_episode tool results so Writers Room can select a new episode.
 */

import { EPISODE_TOOL_ID, ManageToolOperation } from '@/domains/storyteller/ai/tools/manage-tools-wire'
import type { AssistantCompletedToolCall } from '@/shared/chat/assistant/extract-completed-assistant-tool-calls'
import { recordFromJson, readString } from '@/shared/data/json-guards'

export interface CreatedEpisodeFromTool {
  episodeId: string
  title: string
  sequence?: number
}

export function parseCreatedEpisodeFromToolCall(
  call: AssistantCompletedToolCall,
): CreatedEpisodeFromTool | null {
  if (call.toolName !== EPISODE_TOOL_ID) return null

  const args = recordFromJson(call.args)
  const operation = readString(args.operation)
  if (operation !== ManageToolOperation.Create) return null

  const result = recordFromJson(call.result)
  if (result.success === false) return null

  const episode = recordFromJson(result.episode)
  const episodeId = readString(episode.id)
  const title = readString(episode.title)
  if (!episodeId || !title) return null

  const sequence =
    typeof episode.sequence === 'number' && Number.isFinite(episode.sequence)
      ? episode.sequence
      : undefined

  return { episodeId, title, sequence }
}
