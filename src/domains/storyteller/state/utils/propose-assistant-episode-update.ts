/**
 * Map manage_episode create/update tool args into an episode-premise pending
 * proposal. Tool `data.premise` is the source of truth; chat wrap-up is ignored.
 */

import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import type { StreamAgentAction } from '@/domains/storyteller/core/types/action-types'
import { findSectionConfigBySection } from '@/domains/storyteller/config/action-config'
import {
  EPISODE_TOOL_ID,
  ManageToolOperation,
} from '@/domains/storyteller/ai/tools/manage-tools-wire'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import { ActionType, BibleSection } from '@/domains/storyteller/core/types/enums'
import type { AssistantCompletedToolCall } from '@/shared/chat/assistant/extract-completed-assistant-tool-calls'
import { episodePremiseFromUnknown } from '@/domains/storyteller/state/utils/strip-assistant-bible-chat-chrome'
import type { ProposedBibleSectionUpdate } from '@/domains/storyteller/state/utils/propose-assistant-bible-update'

function isSuccessfulResult(result: unknown): boolean {
  const record = recordFromJson(result)
  if (Object.keys(record).length === 0) return false
  if (record.success === false) return false
  return true
}

function isPremiseWrite(operation: string): boolean {
  return operation === ManageToolOperation.Create || operation === ManageToolOperation.Update
}

function resolvedEpisodeId(
  call: AssistantCompletedToolCall,
  episodeId?: string | null,
): string | undefined {
  const args = recordFromJson(call.args)
  const episode = recordFromJson(recordFromJson(call.result).episode)
  return readString(episodeId) ?? readString(args.episodeId) ?? readString(episode.id)
}

function premiseFromEpisodeCall(call: AssistantCompletedToolCall): Record<string, unknown> | undefined {
  const args = recordFromJson(call.args)
  const data = recordFromJson(args.data)
  const result = recordFromJson(call.result)
  const episode = recordFromJson(result.episode)
  const storyPlan = recordFromJson(data.storyPlan ?? episode.storyPlan)
  return (
    episodePremiseFromUnknown(data.premise) ??
    episodePremiseFromUnknown(storyPlan.premise) ??
    episodePremiseFromUnknown(episode.premise)
  )
}

export function proposeAssistantEpisodeUpdate(
  call: AssistantCompletedToolCall,
  episodeId?: string | null,
): ProposedBibleSectionUpdate | null {
  if (call.toolName !== EPISODE_TOOL_ID) return null
  if (!isSuccessfulResult(call.result)) return null
  if (!isPremiseWrite(readString(recordFromJson(call.args).operation) ?? '')) return null

  const premise = premiseFromEpisodeCall(call)
  if (!premise) return null

  const targetEpisodeId = resolvedEpisodeId(call, episodeId)
  const preview = { premise }
  const config = findSectionConfigBySection(BibleSection.EPISODE_PREMISE)
  const payload = config?.extractPayload(preview, targetEpisodeId) ?? {
    episodeId: targetEpisodeId || null,
    premise,
  }

  const action: StreamAgentAction = {
    type: ActionType.UPDATE_EPISODE_PREMISE,
    payload,
    status: ApprovalActionStatus.PENDING,
    id: `assistant-episode-${Date.now()}`,
  }

  const contentPreview = JSON.stringify(preview).slice(0, 120)
  return {
    section: BibleSection.EPISODE_PREMISE,
    action,
    preview,
    dedupeKey: `${EPISODE_TOOL_ID}:${BibleSection.EPISODE_PREMISE}:${contentPreview}`,
  }
}
