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
import { CharacterDraftChatSection } from '@/domains/storyteller/core/storyteller-page-wire'
import type { AssistantCompletedToolCall } from '@/shared/chat/assistant/extract-completed-assistant-tool-calls'
import {
  WorldDescriptionFieldAlias,
  WorldRulesFieldAlias,
} from '@/domains/storyteller/config/constants/bible-wire-fields'
import { CastFieldAlias } from '@/domains/storyteller/core/formatting/constants/story-plan-fields'
import {
  episodePremiseFromUnknown,
  isAssistantChatWrapUp,
} from '@/domains/storyteller/state/utils/strip-assistant-bible-chat-chrome'

export type AssistantBibleToolCall = AssistantCompletedToolCall

export interface ProposedBibleSectionUpdate {
  section: string
  action: StreamAgentAction
  preview: Record<string, unknown>
  dedupeKey: string
  /** Sibling sections from the same tool call — each gets its own overlay. */
  extraFields?: Record<string, unknown>
}

function isSuccessfulResult(result: unknown): boolean {
  const record = recordFromJson(result)
  return record.success === true
}

/** Fields the bible tool may write — taken from tool args for the pending draft. */
export function bibleFieldsFromToolArgs(args: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {}
  const worldDescription = readString(args.worldDescription)
  if (worldDescription && !isAssistantChatWrapUp(worldDescription)) {
    fields.worldDescription = worldDescription
  }
  if (Array.isArray(args.items)) fields.items = args.items
  if (Array.isArray(args.events)) fields.events = args.events
  if (Array.isArray(args.factions)) fields.factions = args.factions
  const worldRules =
    args[WorldRulesFieldAlias.WorldRules] ??
    args[WorldRulesFieldAlias.Rules] ??
    args[WorldRulesFieldAlias.WorldRulesSnake]
  if (Array.isArray(worldRules)) fields.worldRules = worldRules
  const cast =
    args[CastFieldAlias.Cast] ??
    args[CastFieldAlias.Characters] ??
    args[CastFieldAlias.KeyCharacters]
  if (Array.isArray(cast)) fields.cast = cast
  if (Array.isArray(args.plotTwists)) fields.plotTwists = args.plotTwists
  if (Array.isArray(args.soundtracks) && args.soundtracks.length > 0) {
    fields.soundtracks = args.soundtracks
  }
  const moodSoundtrack = readString(args.moodSoundtrack)
  if (moodSoundtrack) fields.moodSoundtrack = moodSoundtrack
  const inspirations = recordFromJson(args.inspirations)
  const inspirationHasItems = [inspirations.books, inspirations.movies, inspirations.games].some(
    bucket => Array.isArray(bucket) && bucket.length > 0,
  )
  if (inspirationHasItems) fields.inspirations = inspirations
  const episodeRoadmap = recordFromJson(args.episodeRoadmap)
  if (Object.keys(episodeRoadmap).length > 0) fields.episodeRoadmap = episodeRoadmap
  const episodePremise = episodePremiseFromUnknown(args.episodePremise)
  if (episodePremise) fields.episodePremise = episodePremise
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

function writtenHasSection(
  written: Record<string, unknown>,
  section: BibleSection,
): boolean {
  const config = SECTION_CONFIGS.find(candidate => candidate.section === section)
  return Boolean(config?.fieldNames.some(name => written[name] !== undefined))
}

/**
 * Soundtrack / filled inspirations keep their own overlay. A world description
 * plus items/events/rules belongs on Overview — those extras must not steal it.
 */
function resolveSectionFromWritten(written: Record<string, unknown>): string | null {
  if (writtenHasSection(written, BibleSection.SOUNDTRACKS)) {
    return BibleSection.SOUNDTRACKS
  }
  if (writtenHasSection(written, BibleSection.INSPIRATIONS)) {
    return BibleSection.INSPIRATIONS
  }
  if (writtenHasSection(written, BibleSection.WORLD_DESCRIPTION)) {
    return BibleSection.WORLD_DESCRIPTION
  }
  if (writtenHasSection(written, BibleSection.EPISODE_PREMISE)) {
    return BibleSection.EPISODE_PREMISE
  }
  if (writtenHasSection(written, BibleSection.EPISODE_ROADMAP)) {
    return BibleSection.EPISODE_ROADMAP
  }
  const structuredKeys = Object.keys(written).filter(key => !OVERVIEW_FIELD_KEYS.has(key))
  if (structuredKeys.length > 0) {
    const config = findSectionConfigByFields(structuredKeys)
    if (config && config.section !== BibleSection.FULL) return config.section
  }
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

export function proposalsFromWrittenBibleFields(
  written: Record<string, unknown>,
  episodeId?: string | null,
  requestedSection?: string,
): ProposedBibleSectionUpdate[] {
  if (requestedSection === CharacterDraftChatSection.Form) return []
  if (Object.keys(written).length === 0) return []

  if (requestedSection) {
    const narrowed = narrowToSection(written, requestedSection)
    const primary = narrowed ? buildProposal(narrowed, requestedSection, episodeId) : null
    const extras = splitFieldsToProposals(
      fieldsOutsideSection(written, requestedSection),
      episodeId,
    )
    return primary ? [primary, ...extras] : extras
  }

  const split = splitFieldsToProposals(written, episodeId)
  const preferred = resolveSectionFromWritten(written)
  if (!preferred || split.length < 2) return split
  const focused: ProposedBibleSectionUpdate[] = []
  const rest: ProposedBibleSectionUpdate[] = []
  for (const proposal of split) {
    if (proposal.section === preferred) focused.push(proposal)
    else rest.push(proposal)
  }
  return [...focused, ...rest]
}

export function proposeAssistantBibleUpdates(
  call: AssistantBibleToolCall,
  episodeId?: string | null,
  requestedSection?: string,
): ProposedBibleSectionUpdate[] {
  if (requestedSection === CharacterDraftChatSection.Form) return []
  if (call.toolName !== UPDATE_WORLD_BIBLE_TOOL_ID) return []
  if (!isSuccessfulResult(call.result)) return []
  return proposalsFromWrittenBibleFields(
    bibleFieldsFromToolArgs(recordFromJson(call.args)),
    episodeId,
    requestedSection,
  )
}

export function proposeAssistantBibleUpdate(
  call: AssistantBibleToolCall,
  episodeId?: string | null,
  requestedSection?: string,
): ProposedBibleSectionUpdate | null {
  const [primary, ...rest] = proposeAssistantBibleUpdates(
    call,
    episodeId,
    requestedSection,
  )
  if (!primary) return null
  const extraFields: Record<string, unknown> = {}
  for (const extra of rest) {
    Object.assign(extraFields, extra.preview)
  }
  return Object.keys(extraFields).length > 0
    ? { ...primary, extraFields }
    : primary
}

function splitFieldsToProposals(
  fields: Record<string, unknown>,
  episodeId?: string | null,
): ProposedBibleSectionUpdate[] {
  const proposals: ProposedBibleSectionUpdate[] = []
  for (const config of SECTION_CONFIGS) {
    if (config.section === BibleSection.FULL) continue
    const sectionPreview: Record<string, unknown> = {}
    for (const name of config.fieldNames) {
      if (fields[name] !== undefined) {
        sectionPreview[name] = fields[name]
      }
    }
    if (Object.keys(sectionPreview).length === 0) continue
    const proposal = buildProposal(sectionPreview, config.section, episodeId)
    if (proposal) proposals.push(proposal)
  }
  return proposals
}

function previewForSection(
  fields: Record<string, unknown>,
  section: string,
): Record<string, unknown> {
  if (section !== BibleSection.EPISODE_PREMISE) return fields
  const premise =
    episodePremiseFromUnknown(fields.episodePremise) ?? episodePremiseFromUnknown(fields.premise)
  return premise ? { premise } : fields
}

function buildProposal(
  fields: Record<string, unknown>,
  section: string,
  episodeId?: string | null,
): ProposedBibleSectionUpdate | null {
  const preview = previewForSection(fields, section)
  const config = SECTION_CONFIGS.find(candidate => candidate.section === section)
  const processed = config
    ? {
        actionType: config.actionType,
        payload: config.extractPayload(preview, episodeId),
      }
    : processToolResultToAction(UPDATE_WORLD_BIBLE_TOOL_ID, preview, episodeId)
  const actionType = processed?.actionType
  const payload = processed?.payload ?? { updatedFields: preview }
  if (!actionType) return null

  const action: StreamAgentAction = {
    type: actionType,
    payload,
    status: ApprovalActionStatus.PENDING,
    id: `assistant-bible-${Date.now()}`,
  }

  const contentPreview = JSON.stringify(preview).slice(0, 120)
  return {
    section,
    action,
    preview,
    dedupeKey: `${UPDATE_WORLD_BIBLE_TOOL_ID}:${section}:${contentPreview}`,
  }
}
