import { ActionType } from '@/domains/storyteller/core/types/enums'
import { StorytellerChatTool } from '@/domains/storyteller/core/storyteller-page-wire'
import { RUN_BEAT_DRAFT_WORKFLOW_TOOL_ID } from '@/domains/storyteller/ai/workflows/beat-draft-contract'
import {
  BEAT_DRAFT_COMPLETED_STATUS,
  BEAT_PIPELINE_COMPLETED_MESSAGE,
  ToolResultDetectedSection,
  ToolResultOutcomeKind,
  ToolResultPayloadField,
} from './constants/tool-result-wire'
import { processToolResultToAction } from './action-config'
import type { DetectedSection, ToolResultOutcome } from './tool-result-mapper'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringField(source: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = source?.[key]
  return typeof value === 'string' ? value : undefined
}

const UPDATE_WORLD_BIBLE_TOOL_ID = StorytellerChatTool.UpdateWorldBible
const MANAGE_BEAT_TOOL_ID = StorytellerChatTool.ManageBeat

interface ResolvedBeatAction {
  actionType: ActionType
  payload: Record<string, unknown>
  requiresApproval: boolean
}

export function resolveBeatDraftCompleted(
  toolName: string,
  parsedRecord: Record<string, unknown>,
): ToolResultOutcome | null {
  if (toolName !== RUN_BEAT_DRAFT_WORKFLOW_TOOL_ID) return null
  if (parsedRecord[ToolResultPayloadField.Status] !== BEAT_DRAFT_COMPLETED_STATUS) return null

  return {
    kind: ToolResultOutcomeKind.Info,
    message:
      stringField(parsedRecord, ToolResultPayloadField.Message) ?? BEAT_PIPELINE_COMPLETED_MESSAGE,
    data: parsedRecord[ToolResultPayloadField.Output] ?? null,
  }
}

export function resolveWorldBibleSuccessAction(args: {
  parsedRecord: Record<string, unknown>
  episodeId?: string | null
}): {
  actionType: string
  actionPayload: Record<string, unknown>
  requiresApproval: boolean
  detectedSection: DetectedSection
} | null {
  const fields = isRecord(args.parsedRecord.updatedFields)
    ? args.parsedRecord.updatedFields
    : Array.isArray(args.parsedRecord.updatedFields)
      ? { ...args.parsedRecord.updatedFields }
      : {}

  const processedAction = processToolResultToAction(
    UPDATE_WORLD_BIBLE_TOOL_ID,
    fields,
    args.episodeId,
  )
  if (!processedAction) return null

  return {
    actionType: processedAction.actionType,
    actionPayload: processedAction.payload,
    requiresApproval: processedAction.requiresApproval,
    detectedSection: processedAction.section,
  }
}

export function resolveManageBeatSuccessAction(
  parsedRecord: Record<string, unknown>,
  resolveManageBeatAction: (record: Record<string, unknown>) => ResolvedBeatAction | null,
): {
  actionType: string
  actionPayload: Record<string, unknown>
  requiresApproval: boolean
  detectedSection: DetectedSection
} | null {
  const beatAction = resolveManageBeatAction(parsedRecord)
  if (!beatAction) return null

  return {
    actionType: beatAction.actionType,
    actionPayload: beatAction.payload,
    requiresApproval: beatAction.requiresApproval,
    detectedSection: ToolResultDetectedSection.Beats,
  }
}

export { UPDATE_WORLD_BIBLE_TOOL_ID, MANAGE_BEAT_TOOL_ID, isRecord }
