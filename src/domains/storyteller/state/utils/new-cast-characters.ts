import { parseReferences, stripReferences } from '@/domains/storyteller/core/entities/reference-parser'
import { CastFieldAlias } from '@/domains/storyteller/core/formatting/constants/story-plan-fields'
import { readCastFromPlan } from '@/domains/storyteller/core/formatting/story-plan-fields'
import { ActionType } from '@/domains/storyteller/core/types/enums'
import type { StreamAgentAction } from '@/domains/storyteller/core/types/action-types'
import {
  NEW_CAST_ACTION_ID_PREFIX,
  NEW_CAST_DESCRIPTION_MAX_LENGTH,
  NEW_CAST_ENTITY_TYPE,
  NEW_CAST_SENTENCE_SPLIT,
  NewCastField,
} from '@/domains/storyteller/state/utils/constants/new-cast-characters'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import { CharacterRole } from '@/shared/data/constants/protocol'
import {
  namedRecordsFromJson,
  readString,
  recordFromJson,
  stringArrayFromJson,
} from '@/shared/data/json-guards'

export interface CastCandidate {
  name: string
  description: string
}

export interface CollectCastCandidatesInput {
  previews?: readonly Record<string, unknown>[]
  beatPayloads?: readonly Record<string, unknown>[]
}

function stripAndCap(text: string): string {
  const stripped = stripReferences(text).trim()
  if (stripped.length <= NEW_CAST_DESCRIPTION_MAX_LENGTH) return stripped
  return stripped.slice(0, NEW_CAST_DESCRIPTION_MAX_LENGTH)
}

function sentenceContaining(text: string, startIndex: number): string {
  const parts = text.split(NEW_CAST_SENTENCE_SPLIT)
  let cursor = 0
  for (const part of parts) {
    const end = cursor + part.length
    if (startIndex >= cursor && startIndex <= end) {
      return stripAndCap(part.trim())
    }
    cursor = end
    while (cursor < text.length && /\s/.test(text.charAt(cursor))) {
      cursor += 1
    }
  }
  return stripAndCap(text)
}

function addCandidate(
  byName: Map<string, CastCandidate>,
  name: string,
  description: string,
): void {
  const trimmed = stripReferences(name).trim()
  if (!trimmed) return
  const key = trimmed.toLowerCase()
  if (byName.has(key)) return
  byName.set(key, { name: trimmed, description })
}

function collectRefsFromText(text: string, byName: Map<string, CastCandidate>): void {
  for (const ref of parseReferences(text)) {
    if (ref.type !== NEW_CAST_ENTITY_TYPE) continue
    addCandidate(byName, ref.displayName, sentenceContaining(text, ref.startIndex))
  }
}

function collectRefsFromValue(value: unknown, byName: Map<string, CastCandidate>): void {
  if (typeof value === 'string') {
    collectRefsFromText(value, byName)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectRefsFromValue(item, byName)
    return
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectRefsFromValue(item, byName)
  }
}

function collectFromBeatPayload(
  payload: Record<string, unknown>,
  byName: Map<string, CastCandidate>,
): void {
  const logline = readString(payload[NewCastField.Logline]) ?? ''
  const description = stripAndCap(logline)
  for (const name of stringArrayFromJson(payload[NewCastField.CharactersInvolved])) {
    addCandidate(byName, name, description)
  }
  collectRefsFromValue(payload, byName)
}

export function collectCastCandidates(input: CollectCastCandidatesInput): CastCandidate[] {
  const byName = new Map<string, CastCandidate>()
  for (const preview of input.previews ?? []) {
    collectRefsFromValue(preview, byName)
  }
  for (const payload of input.beatPayloads ?? []) {
    collectFromBeatPayload(payload, byName)
  }
  return Array.from(byName.values())
}

export function existingCastNames(
  characters: readonly { name: string }[],
  plan: unknown,
): string[] {
  const names = new Set<string>()
  for (const character of characters) {
    const name = stripReferences(character.name).trim()
    if (name) names.add(name)
  }
  for (const entry of namedRecordsFromJson(readCastFromPlan(recordFromJson(plan)))) {
    const name = stripReferences(entry.name).trim()
    if (name) names.add(name)
  }
  return Array.from(names)
}

export function existingCastEntries(
  characters: readonly { name: string; role?: string; description?: string }[],
  plan: unknown,
): Record<string, unknown>[] {
  const fromPlan = namedRecordsFromJson(readCastFromPlan(recordFromJson(plan)))
  const seen = new Set(fromPlan.map(entry => entry.name.toLowerCase()))
  const extras = characters
    .filter(character => character.name && !seen.has(character.name.toLowerCase()))
    .map(character => ({
      [NewCastField.Name]: character.name,
      [NewCastField.Role]: character.role,
      [NewCastField.Description]: character.description,
    }))
  return [...fromPlan, ...extras]
}

export function newCastMembers(
  candidates: readonly CastCandidate[],
  existingNames: readonly string[],
): CastCandidate[] {
  const existing = new Set(existingNames.map(name => name.toLowerCase()))
  return candidates.filter(candidate => !existing.has(candidate.name.toLowerCase()))
}

function toCastEntry(candidate: CastCandidate): Record<string, unknown> {
  return {
    [NewCastField.Name]: candidate.name,
    [NewCastField.Role]: CharacterRole.Supporting,
    [NewCastField.Description]: candidate.description,
  }
}

export function updateCastAction(input: {
  existingCast: readonly unknown[]
  additions: readonly CastCandidate[]
}): StreamAgentAction {
  return {
    type: ActionType.UPDATE_CAST,
    payload: {
      [CastFieldAlias.Cast]: [...input.existingCast, ...input.additions.map(toCastEntry)],
    },
    status: ApprovalActionStatus.COMMITTED,
    id: `${NEW_CAST_ACTION_ID_PREFIX}-${Date.now()}`,
  }
}
