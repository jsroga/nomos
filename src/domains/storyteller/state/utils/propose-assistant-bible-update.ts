/**
 * Map an assistant-ui update_world_bible tool call into a section pending-action
 * proposal (draft preview + Accept/Reject). Tool args carry the content; the
 * tool result only lists updated field names.
 */

import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import type { StreamAgentAction } from '@/domains/storyteller/core/types/action-types'
import {
  SECTION_CONFIGS,
  findSectionConfigByFields,
  processToolResultToAction,
} from '@/domains/storyteller/config/action-config'
import { UPDATE_WORLD_BIBLE_TOOL_ID } from '@/domains/storyteller/ai/tools/manage-tools-wire'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import type { AssistantCompletedToolCall } from '@/shared/chat/assistant/extract-completed-assistant-tool-calls'
import { WorldDescriptionFieldAlias } from '@/domains/storyteller/config/constants/bible-wire-fields'

export type AssistantBibleToolCall = AssistantCompletedToolCall

export interface ProposedBibleSectionUpdate {
  section: string
  action: StreamAgentAction
  preview: Record<string, unknown>
  dedupeKey: string
  /** Off-section fields the tool also returned — UI may confirm before applying. */
  extraFields?: Record<string, unknown>
}

function isSuccessfulResult(result: unknown): boolean {
  const record = recordFromJson(result)
  if (Object.keys(record).length === 0) return false
  if (record.success === false) return false
  return true
}

/** Fields the bible tool may write — taken from tool args for the pending draft. */
function bibleFieldsFromArgs(args: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {}
  const worldDescription = readString(args.worldDescription)
  if (worldDescription) fields.worldDescription = worldDescription
  if (Array.isArray(args.items)) fields.items = args.items
  if (Array.isArray(args.events)) fields.events = args.events
  if (Array.isArray(args.factions)) fields.factions = args.factions
  if (Array.isArray(args.worldRules)) fields.worldRules = args.worldRules
  if (Array.isArray(args.plotTwists)) fields.plotTwists = args.plotTwists
  if (Array.isArray(args.soundtracks)) fields.soundtracks = args.soundtracks
  const moodSoundtrack = readString(args.moodSoundtrack)
  if (moodSoundtrack) fields.moodSoundtrack = moodSoundtrack
  const inspirations = recordFromJson(args.inspirations)
  if (Object.keys(inspirations).length > 0) fields.inspirations = inspirations
  return fields
}

/** Fields belonging to `section`, or null when the write missed it entirely. */
function narrowToSection(
  fields: Record<string, unknown>,
  section: string,
): Record<string, unknown> | null {
  const config = SECTION_CONFIGS.find(candidate => candidate.section === section)
  if (!config) return null
  const narrowed: Record<string, unknown> = {}
  for (const name of config.fieldNames) {
    if (fields[name] !== undefined) narrowed[name] = fields[name]
  }
  return Object.keys(narrowed).length > 0 ? narrowed : null
}

const OVERVIEW_FIELD_KEYS = new Set<string>([
  WorldDescriptionFieldAlias.WorldDescription,
  WorldDescriptionFieldAlias.Description,
  WorldDescriptionFieldAlias.WorldDescriptionSnake,
  WorldDescriptionFieldAlias.Overview,
])

/**
 * Prefer structured bible sections over Overview. Free-chat dumps of the reply
 * into worldDescription must not steal the pending-review overlay.
 */
function resolveSectionFromWritten(written: Record<string, unknown>): string | null {
  const keys = Object.keys(written)
  const structuredKeys = keys.filter(key => !OVERVIEW_FIELD_KEYS.has(key))
  if (structuredKeys.length > 0) {
    const config = findSectionConfigByFields(structuredKeys)
    if (config && config.section !== BibleSection.FULL) return config.section
  }
  // Overview-only writes without a panel request are ignored — use Add to world
  // or the Overview refresh button instead of auto-blurring after every chat turn.
  return null
}

function fieldsOutsideSection(
  written: Record<string, unknown>,
  section: string,
): Record<string, unknown> {
  const config = SECTION_CONFIGS.find(candidate => candidate.section === section)
  const allowed = new Set(config?.fieldNames ?? [])
  const extras: Record<string, unknown> = {}
  for (const key of Object.keys(written)) {
    if (!allowed.has(key)) extras[key] = written[key]
  }
  return extras
}

export function proposeAssistantBibleUpdate(
  call: AssistantBibleToolCall,
  episodeId?: string | null,
  requestedSection?: string,
): ProposedBibleSectionUpdate | null {
  if (call.toolName !== UPDATE_WORLD_BIBLE_TOOL_ID) return null
  if (!isSuccessfulResult(call.result)) return null

  const args = recordFromJson(call.args)
  const written = bibleFieldsFromArgs(args)
  if (Object.keys(written).length === 0) return null

  // A panel asked for one section: propose only that section's fields, so an
  // off-target write cannot queue an overwrite of a panel nobody asked about.
  if (requestedSection) {
    const narrowed = narrowToSection(written, requestedSection)
    if (!narrowed) return null
    const extraFields = fieldsOutsideSection(written, requestedSection)
    return buildProposal(
      narrowed,
      requestedSection,
      episodeId,
      Object.keys(extraFields).length > 0 ? extraFields : undefined,
    )
  }

  const section = resolveSectionFromWritten(written)
  if (!section) return null
  const narrowed = narrowToSection(written, section) ?? written
  return buildProposal(narrowed, section, episodeId)
}

function buildProposal(
  fields: Record<string, unknown>,
  section: string,
  episodeId?: string | null,
  extraFields?: Record<string, unknown>,
): ProposedBibleSectionUpdate | null {
  const processed = processToolResultToAction(UPDATE_WORLD_BIBLE_TOOL_ID, fields, episodeId)
  const actionType = processed?.actionType
  const payload = processed?.payload ?? { updatedFields: fields }
  if (!actionType) return null

  const action: StreamAgentAction = {
    type: actionType,
    payload,
    status: ApprovalActionStatus.PENDING,
    id: `assistant-bible-${Date.now()}`,
  }

  const contentPreview = JSON.stringify(fields).slice(0, 120)
  return {
    section,
    action,
    preview: fields,
    dedupeKey: `${UPDATE_WORLD_BIBLE_TOOL_ID}:${section}:${contentPreview}`,
    ...(extraFields ? { extraFields } : {}),
  }
}
