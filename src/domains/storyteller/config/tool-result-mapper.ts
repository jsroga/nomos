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

import { ActionType, BibleSection } from '@/domains/storyteller/core/types/enums'
import { CastFieldAlias } from '@/domains/storyteller/core/formatting/constants/story-plan-fields'
import {
  BIBLE_SECTION_UPDATE_KEYS,
  PREMISE_SECTION_UPDATE_KEYS,
  SoundtrackFieldAlias,
} from './constants/bible-wire-fields'
import {
  ManageBeatOperationToken,
  MANAGE_BEAT_UNTITLED_LABEL,
  ToolResultDetectedSection,
  ToolResultOutcomeKind,
  ToolResultPayloadField,
} from './constants/tool-result-wire'
import { getActionTypeForSection } from './action-config'
import {
  isRecord,
  MANAGE_BEAT_TOOL_ID,
  resolveBeatDraftCompleted,
  resolveManageBeatSuccessAction,
  resolveWorldBibleSuccessAction,
  UPDATE_WORLD_BIBLE_TOOL_ID,
} from './map-tool-result-handlers'
import { EPISODE_TOOL_ID } from '@/domains/storyteller/ai/tools/manage-tools-wire'

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

function stringField(source: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = source?.[key]
  return typeof value === 'string' ? value : undefined
}

/** Section keys recognised in update tool args (for the section_loading shimmer). */
const SECTION_KEYS = BIBLE_SECTION_UPDATE_KEYS

const PREMISE_SECTIONS = PREMISE_SECTION_UPDATE_KEYS

/**
 * Determine which bible section a tool call is loading, for the UI shimmer.
 * Returns the normalized section name, or null if not applicable.
 */
export function detectLoadingSection(
  toolName: string,
  toolArgs: Record<string, unknown>
): string | null {
  if (toolName === EPISODE_TOOL_ID) {
    const data = isRecord(toolArgs.data) ? toolArgs.data : {}
    const storyPlan = isRecord(data.storyPlan) ? data.storyPlan : {}
    if (isRecord(data.premise) || isRecord(storyPlan.premise)) {
      return BibleSection.EPISODE_PREMISE
    }
    return null
  }

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

  if (argSection === SoundtrackFieldAlias.MoodSoundtrack) {
    argSection = BibleSection.SOUNDTRACKS
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
interface ResolvedBeatAction {
  actionType: ActionType
  payload: Record<string, unknown>
  requiresApproval: boolean
}

/** Resolve a manage-beat tool result into a beat action (create/update/delete/…). */
function resolveManageBeatAction(parsedRecord: Record<string, unknown>): ResolvedBeatAction | null {
  if (!isRecord(parsedRecord.beat)) return null
  const beat = parsedRecord.beat
  const operation = stringField(parsedRecord, ToolResultPayloadField.Message)?.toLowerCase() ?? ''
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
  if (!matchedAction) return null
  const [, config] = matchedAction
  return { actionType: config.type, payload: config.payload, requiresApproval: config.approval }
}

function resolveSuccessfulToolAction(args: {
  toolName: string
  parsedRecord: Record<string, unknown>
  episodeId?: string | null
}): {
  actionType: string
  actionPayload: Record<string, unknown>
  requiresApproval: boolean
  detectedSection: DetectedSection
} | null {
  if (args.toolName === UPDATE_WORLD_BIBLE_TOOL_ID) {
    return resolveWorldBibleSuccessAction({
      parsedRecord: args.parsedRecord,
      episodeId: args.episodeId,
    })
  }

  if (args.toolName === MANAGE_BEAT_TOOL_ID) {
    return resolveManageBeatSuccessAction(args.parsedRecord, resolveManageBeatAction)
  }

  return null
}

function resolveSectionFallbackAction(args: {
  toolName: string
  isSectionUpdate: boolean
  detectedSection: DetectedSection
  parsedRecord: Record<string, unknown> | undefined
}): {
  actionType: string
  actionPayload: Record<string, unknown>
  requiresApproval: boolean
} | null {
  if (
    args.isSectionUpdate &&
    args.toolName === UPDATE_WORLD_BIBLE_TOOL_ID &&
    args.detectedSection !== ToolResultDetectedSection.Beats
  ) {
    return {
      actionType: getActionTypeForSection(args.detectedSection),
      actionPayload: isRecord(args.parsedRecord?.updatedFields)
        ? args.parsedRecord.updatedFields
        : (args.parsedRecord ?? {}),
      requiresApproval: true,
    }
  }

  return null
}

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

  if (parsedRecord) {
    const beatDraftOutcome = resolveBeatDraftCompleted(toolName, parsedRecord)
    if (beatDraftOutcome) return beatDraftOutcome
  }

  if (parsedRecord?.[ToolResultPayloadField.Success]) {
    const successAction = resolveSuccessfulToolAction({
      toolName,
      parsedRecord,
      episodeId: args.episodeId,
    })
    if (successAction) {
      actionType = successAction.actionType
      actionPayload = successAction.actionPayload
      requiresApproval = successAction.requiresApproval
      detectedSection = successAction.detectedSection
    }
  }

  if (!actionType) {
    const fallbackAction = resolveSectionFallbackAction({
      toolName,
      isSectionUpdate,
      detectedSection,
      parsedRecord,
    })
    if (fallbackAction) {
      actionType = fallbackAction.actionType
      actionPayload = fallbackAction.actionPayload
      requiresApproval = fallbackAction.requiresApproval
    }
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
