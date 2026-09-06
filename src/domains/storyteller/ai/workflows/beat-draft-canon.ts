import '@/shared/data/server-guard'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import {
  CanonLayer,
  SECTION_REGISTRY,
  WORLD_BIBLE_SECTIONS,
} from '@/domains/storyteller/core/bible/section-registry'
import { isPlainObject } from '@/shared/data/json-guards'
import type { BeatDraftCanon } from '@/domains/storyteller/core/types/beat-draft-canon'

export {
  BeatDraftCanonBeatSchema,
  BeatDraftCanonSchema,
  DraftBeatId,
  emptyBeatDraftCanon,
  type BeatDraftCanon,
  type BeatDraftCanonBeat,
} from '@/domains/storyteller/core/types/beat-draft-canon'

export enum CanonAudience {
  Author = 'author',
  Planner = 'planner',
  Continuity = 'continuity',
  Stakes = 'stakes',
}

function seesAuthorTruth(audience: CanonAudience): boolean {
  return audience === CanonAudience.Planner || audience === CanonAudience.Continuity
}

function seesOtherSlots(audience: CanonAudience): boolean {
  return audience === CanonAudience.Planner || audience === CanonAudience.Continuity
}

function entryName(entry: unknown): string {
  if (typeof entry === 'string') return entry
  if (isPlainObject(entry) && typeof entry.name === 'string') return entry.name
  return ''
}

function filterCast(value: unknown, characters: string[], audience: CanonAudience): unknown {
  if (audience === CanonAudience.Author && characters.length === 0) return undefined
  if (!Array.isArray(value) || characters.length === 0) return value
  const wanted = new Set(characters.map(name => name.toLowerCase()))
  return value.filter(entry => wanted.has(entryName(entry).toLowerCase()))
}

function includeSection(section: string, audience: CanonAudience): boolean {
  const spec = WORLD_BIBLE_SECTIONS.find(candidate => candidate === section)
  if (!spec) return false
  const layer = SECTION_REGISTRY[spec].canonLayer
  if (layer === CanonLayer.AuthorTruth) return seesAuthorTruth(audience)
  if (layer === CanonLayer.RevealBoundary) return audience !== CanonAudience.Author
  return true
}

/**
 * JSON/text blocks from the layers this audience may see. CAST is filtered to
 * `characters` (case-insensitive). Empty `characters` omits CAST for Author.
 */
export function formatCanonFor(
  audience: CanonAudience,
  canon: BeatDraftCanon,
  characters: string[]
): string {
  const blocks: Record<string, unknown> = {}
  for (const [key, payload] of Object.entries(canon.sections)) {
    if (!includeSection(key, audience)) continue
    const value =
      key === BibleSection.CAST ? filterCast(payload, characters, audience) : payload
    if (value === undefined) continue
    blocks[key] = value
  }

  const parts = [JSON.stringify(blocks)]
  if (canon.currentRoadmapSlotText.length > 0) {
    parts.push(canon.currentRoadmapSlotText)
  }
  if (seesOtherSlots(audience) && canon.otherRoadmapSlotsText.length > 0) {
    parts.push(canon.otherRoadmapSlotsText)
  }
  const ledger = formatKnowledgeLedger(audience, canon)
  if (ledger.length > 0) parts.push(ledger)
  return parts.join('\n')
}

function formatKnowledgeLedger(audience: CanonAudience, canon: BeatDraftCanon): string {
  const rows = canon.knowledgeLedger ?? []
  const visible = rows.filter(row => {
    if (row.revoked) return false
    if (row.authorTruth) return seesAuthorTruth(audience)
    return true
  })
  if (visible.length === 0) return ''
  return `KNOWLEDGE_LEDGER:\n${JSON.stringify(visible)}`
}
