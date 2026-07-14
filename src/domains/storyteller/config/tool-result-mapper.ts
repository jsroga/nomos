/**
 * Tool-result → UI action mapping for the storyteller chat stream.
 *
 * Pure functions extracted from the chat stream route so the mapping logic is
 * unit-testable in isolation. The route handles the surrounding I/O
 * (entity auto-linking, dedup, SSE emission).
 *
 * Only tools that exist in `agents/tools` are mapped — the legacy phantom
 * branches (update_story_phase, create_character, create_episode,
 * consult_premise_architect, ask_*) were removed with the writers'-room
 * architecture; their behavior is pinned by
 * `__tests__/tool-result-mapper.test.ts`.
 */

import { ActionType, BibleSection } from '@/domains/storyteller/core/types/Enums'
import { RUN_BEAT_DRAFT_WORKFLOW_TOOL_ID } from '@/domains/storyteller/agents/workflows/beat-draft-contract'
import { StorytellerChatTool } from '@/domains/storyteller/core/storyteller-page-wire'
import { CastFieldAlias } from '@/domains/storyteller/core/formatting/constants/story-plan-fields'
import {
  BIBLE_SECTION_UPDATE_KEYS,
  PREMISE_SECTION_UPDATE_KEYS,
} from './constants/bible-wire-fields'
import {
  BEAT_DRAFT_COMPLETED_STATUS,
  BEAT_PIPELINE_COMPLETED_MESSAGE,
  ManageBeatOperationToken,
  MANAGE_BEAT_UNTITLED_LABEL,
  ToolResultDetectedSection,
  ToolResultOutcomeKind,
  ToolResultPayloadField,
} from './constants/tool-result-wire'
import { processToolResultToAction, getActionTypeForSection } from './action-config'

export type DetectedSection = BibleSection | ToolResultDetectedSection

export type ToolResultOutcome =
  | { kind: ToolResultOutcomeKind.Questions; questions: unknown[] }
  | { kind: ToolResultOutcomeKind.Info; message: string; data: unknown }
  | { kind: ToolResultOutcomeKind.Navigation; action: string; episodeId?: string | null }
  | {
      kind: ToolResultOutcomeKind.Action
      actionType: string
      actionPayload: Record<string, unknown>
      requiresApproval: boolean
      detectedSection: DetectedSection
    }
  | { kind: ToolResultOutcomeKind.None }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringField(source: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = source?.[key]
  return typeof value === 'string' ? value : undefined
}

/** Section keys recognised in update tool args (for the section_loading shimmer). */
const SECTION_KEYS = BIBLE_SECTION_UPDATE_KEYS

const PREMISE_SECTIONS = PREMISE_SECTION_UPDATE_KEYS

const UPDATE_WORLD_BIBLE_TOOL_ID = StorytellerChatTool.UpdateWorldBible
const MANAGE_BEAT_TOOL_ID = StorytellerChatTool.ManageBeat

/**
 * Determine which bible section a tool call is loading, for the UI shimmer.
 * Returns the normalized section name, or null if not applicable.
 */
export function detectLoadingSection(
  toolName: string,
  toolArgs: Record<string, unknown>
): string | null {
  if (toolName !== UPDATE_WORLD_BIBLE_TOOL_ID) {
    return null
  }

  let argSection =
    stringField(toolArgs, ToolResultPayloadField.Section) ||
    Object.keys(toolArgs).find(k => SECTION_KEYS.includes(k))

  if (argSection && PREMISE_SECTIONS.includes(argSection)) {
    // Regenerating an individual premise field → show shimmer on the premise panel
    argSection = BibleSection.EPISODE_PREMISE
  }

  if (!argSection) return null

  return argSection === CastFieldAlias.Characters || argSection === CastFieldAlias.Cast
    ? CastFieldAlias.KeyCharacters
    : argSection
}

/**
 * Deduplication key for an action.
 * Format: toolName:section:contentHash (beats keyed by id/title).
 */
export function getActionDedupeKey(
  toolName: string,
  section: string,
  payload: Record<string, unknown>
): string {
  if (toolName === MANAGE_BEAT_TOOL_ID) {
    const beat = isRecord(payload.beat) ? payload.beat : undefined
    const beatId =
      stringField(payload, ToolResultPayloadField.Id) ||
      stringField(payload, ToolResultPayloadField.BeatId) ||
      stringField(beat, ToolResultPayloadField.Id)
    const beatTitle =
      stringField(payload, ToolResultPayloadField.Title) ||
      stringField(beat, ToolResultPayloadField.Title) ||
      MANAGE_BEAT_UNTITLED_LABEL
    return `manage_beat:${beatId || beatTitle}`
  }

  if (toolName === UPDATE_WORLD_BIBLE_TOOL_ID) {
    const contentPreview = JSON.stringify(payload || {}).slice(0, 100)
    return `${toolName}:${section}:${contentPreview}`
  }

  const payloadKeys = Object.keys(payload || {})
    .sort()
    .join(',')
  return `${toolName}:${section}:${payloadKeys}`
}

/**
 * Map a parsed tool result to a UI outcome (action, info, or none).
 * Pure: all I/O is left to the caller.
 */
export function mapToolResultToAction(args: {
  toolName: string
  parsed: unknown
  episodeId?: string | null
  isSectionUpdate: boolean
  currentSection: DetectedSection
}): ToolResultOutcome {
  const { toolName, parsed, isSectionUpdate, currentSection } = args
  const parsedRecord = isRecord(parsed) ? parsed : undefined

  let actionType: string | null = null
  let actionPayload: Record<string, unknown> = {}
  let requiresApproval = false
  let detectedSection: DetectedSection = currentSection

  // Completed beat-draft runs surface as info (the SUSPENDED case is handled
  // by the route directly — it emits the questions/awaiting_input frames).
  if (
    toolName === RUN_BEAT_DRAFT_WORKFLOW_TOOL_ID &&
    parsedRecord &&
    parsedRecord[ToolResultPayloadField.Status] === BEAT_DRAFT_COMPLETED_STATUS
  ) {
    return {
      kind: ToolResultOutcomeKind.Info,
      message:
        stringField(parsedRecord, ToolResultPayloadField.Message) ?? BEAT_PIPELINE_COMPLETED_MESSAGE,
      data: parsedRecord[ToolResultPayloadField.Output] ?? null,
    }
  }

  if (parsedRecord?.[ToolResultPayloadField.Success]) {
    if (toolName === UPDATE_WORLD_BIBLE_TOOL_ID) {
      const fields = isRecord(parsedRecord.updatedFields)
        ? parsedRecord.updatedFields
        : Array.isArray(parsedRecord.updatedFields)
          ? { ...parsedRecord.updatedFields }
          : {}
      const processedAction = processToolResultToAction(toolName, fields, args.episodeId)
      if (processedAction) {
        actionType = processedAction.actionType
        actionPayload = processedAction.payload
        requiresApproval = processedAction.requiresApproval
        detectedSection = processedAction.section
      }
    } else if (toolName === MANAGE_BEAT_TOOL_ID && isRecord(parsedRecord.beat)) {
      const beat = parsedRecord.beat
      const operation =
        stringField(parsedRecord, ToolResultPayloadField.Message)?.toLowerCase() ?? ''
      const beatActions: Record<
        string,
        { type: ActionType; payload: Record<string, unknown>; approval: boolean }
      > = {
        [ManageBeatOperationToken.Created]: {
          type: ActionType.CREATE_BEAT,
          payload: beat,
          approval: true,
        },
        [ManageBeatOperationToken.Updated]: {
          type: ActionType.UPDATE_BEAT,
          payload: { beatId: beat.id, updates: beat },
          approval: true,
        },
        [ManageBeatOperationToken.Deleted]: {
          type: ActionType.DELETE_BEAT,
          payload: { beatId: parsedRecord.deletedId ?? beat.id },
          approval: false,
        },
        [ManageBeatOperationToken.Approved]: {
          type: ActionType.UPDATE_BEAT,
          payload: { beatId: beat.id, updates: { status: parsedRecord.status } },
          approval: false,
        },
        [ManageBeatOperationToken.Locked]: {
          type: ActionType.UPDATE_BEAT,
          payload: { beatId: beat.id, updates: { status: parsedRecord.status } },
          approval: false,
        },
      }

      const matchedAction = Object.entries(beatActions).find(([key]) => operation.includes(key))
      if (matchedAction) {
        const [, config] = matchedAction
        actionType = config.type
        actionPayload = config.payload
        requiresApproval = config.approval
        detectedSection = ToolResultDetectedSection.Beats
      }
    }
  }

  // FALLBACK: detected section update but no action mapped → generic section action
  // ('beats' is excluded by narrowing — the fallback only applies to bible sections)
  if (
    !actionType &&
    isSectionUpdate &&
    toolName === UPDATE_WORLD_BIBLE_TOOL_ID &&
    detectedSection !== ToolResultDetectedSection.Beats
  ) {
    actionType = getActionTypeForSection(detectedSection)
    actionPayload = isRecord(parsedRecord?.updatedFields)
      ? parsedRecord.updatedFields
      : (parsedRecord ?? {})
    requiresApproval = true
  }

  if (!actionType) return { kind: ToolResultOutcomeKind.None }

  return {
    kind: ToolResultOutcomeKind.Action,
    actionType,
    actionPayload,
    requiresApproval,
    detectedSection,
  }
}
