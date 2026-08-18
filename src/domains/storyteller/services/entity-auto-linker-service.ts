/**
 * Entity Auto-Linker Service
 *
 * Post-processes AI-generated text to automatically convert plain entity mentions
 * into entity references [Name][id] when the entity exists in the project.
 *
 * Example:
 * Input:  "The Mood Wardens control the city"
 * Output: "[The Mood Wardens][faction-the-mood-wardens] control the city"
 */

import { namedRecordsFromJson, readString, recordArrayFromJson, recordFromJson } from '@/shared/data/json-guards'
import { parseStoryPlanRecord } from '@/domains/storyteller/core/io/project-jsonb'
import {
  AutoLinkerEntityType,
  ENTITY_AUTO_LINKER_MIN_STRING_LENGTH,
  EntityAutoLinkerArticlePrefix,
  EntityAutoLinkerIdPrefix,
  EntityAutoLinkerLog,
  EntityAutoLinkerRegexFlag,
  EntityAutoLinkerRegexReplacement,
} from '@/domains/storyteller/services/constants/entity-auto-linker'
import { mapLinkedValue } from '@/domains/storyteller/services/entity-auto-linker-map'

interface EntityMatch {
  name: string
  id: string
  type: string
  startIndex: number
  endIndex: number
}

interface EntityRef {
  id: string
  type: string
}

const slugify = (value: string): string => value.toLowerCase().replace(/\s+/g, '-')

/** Set the "The "-stripped variant of a name, optionally only when unclaimed. */
function addArticleVariant(
  map: Map<string, EntityRef>,
  name: string,
  ref: EntityRef,
  opts: { guard?: boolean; minLen?: number } = {}
): void {
  if (!name.startsWith(EntityAutoLinkerArticlePrefix.The)) return
  const withoutThe = name.slice(EntityAutoLinkerArticlePrefix.The.length)
  const key = withoutThe.toLowerCase()
  if (opts.minLen !== undefined && withoutThe.length <= opts.minLen) return
  if (opts.guard && map.has(key)) return
  map.set(key, ref)
}

function addFactions(map: Map<string, EntityRef>, storyPlan: Record<string, unknown>): void {
  for (const faction of namedRecordsFromJson(storyPlan.factions)) {
    const name = faction.name
    const ref: EntityRef = {
      id: `${EntityAutoLinkerIdPrefix.Faction}-${readString(faction.id)?.slice(0, 8) || slugify(name)}`,
      type: AutoLinkerEntityType.Faction,
    }
    map.set(name.toLowerCase(), ref)
    addArticleVariant(map, name, ref)
  }
}

function addCharacters(
  map: Map<string, EntityRef>,
  cast: Record<string, unknown>[],
  storyPlan: Record<string, unknown>
): void {
  const allCharacters = [...cast, ...recordArrayFromJson(storyPlan.keyCharacters)]
  for (const rawChar of allCharacters) {
    const char = recordFromJson(rawChar)
    const charName = readString(char.name)
    if (!charName) continue
    const ref: EntityRef = {
      id: `${EntityAutoLinkerIdPrefix.Character}-${readString(char.id)?.slice(0, 8) || slugify(charName)}`,
      type: AutoLinkerEntityType.Character,
    }
    map.set(charName.toLowerCase(), ref)

    const firstName = charName.split(' ')[0]
    if (firstName && firstName.length > 2 && !map.has(firstName.toLowerCase())) {
      map.set(firstName.toLowerCase(), ref)
    }
    addArticleVariant(map, charName, ref, { guard: true, minLen: 2 })
  }
}

function addWorldRules(map: Map<string, EntityRef>, storyPlan: Record<string, unknown>): void {
  for (const rawRule of recordArrayFromJson(storyPlan.worldRules)) {
    const rule = recordFromJson(rawRule)
    const ruleText = readString(rule.rule)
    if (!ruleText) continue
    const ruleId = `${EntityAutoLinkerIdPrefix.Rule}-${readString(rule.id)?.slice(0, 8) || slugify(ruleText).slice(0, 30)}`
    const ruleKey = ruleText.split(' ').slice(0, 5).join(' ').toLowerCase()
    map.set(ruleKey, { id: ruleId, type: AutoLinkerEntityType.Rule })
  }
}

/** Named entities (items, events) that share the base-name + article-variant pattern. */
function addNamedEntities(
  map: Map<string, EntityRef>,
  rows: Record<string, unknown>[],
  idPrefix: string,
  type: string
): void {
  for (const raw of rows) {
    const row = recordFromJson(raw)
    const name = readString(row.name)
    if (!name) continue
    const ref: EntityRef = {
      id: `${idPrefix}-${readString(row.id)?.slice(0, 8) || slugify(name)}`,
      type,
    }
    map.set(name.toLowerCase(), ref)
    addArticleVariant(map, name, ref)
  }
}

function buildEntityMap(
  storyPlan: Record<string, unknown>,
  cast: Record<string, unknown>[]
): Map<string, EntityRef> {
  const entityMap = new Map<string, EntityRef>()
  addFactions(entityMap, storyPlan)
  addCharacters(entityMap, cast, storyPlan)
  addWorldRules(entityMap, storyPlan)
  addNamedEntities(
    entityMap,
    recordArrayFromJson(storyPlan.items),
    EntityAutoLinkerIdPrefix.Item,
    AutoLinkerEntityType.Item
  )
  addNamedEntities(
    entityMap,
    recordArrayFromJson(storyPlan.events),
    EntityAutoLinkerIdPrefix.Event,
    AutoLinkerEntityType.Event
  )
  return entityMap
}

/** Find plain-text occurrences of known entity names not already inside a reference. */
function collectEntityMatches(text: string, entityMap: Map<string, EntityRef>): EntityMatch[] {
  const existingRefRanges: Array<{ start: number; end: number }> = []
  const existingRefPattern = /\[([^\]]+)\]\[([^\]\s]+)\]/g
  let existingMatch
  while ((existingMatch = existingRefPattern.exec(text)) !== null) {
    existingRefRanges.push({
      start: existingMatch.index,
      end: existingMatch.index + existingMatch[0].length,
    })
  }
  const isInsideExistingRef = (start: number, end: number) =>
    existingRefRanges.some(r => start >= r.start && end <= r.end)

  const matches: EntityMatch[] = []
  // Longest names first so "The Mood Wardens" wins over "Mood Wardens".
  const sortedNames = Array.from(entityMap.keys()).sort((a, b) => b.length - a.length)

  for (const entityName of sortedNames) {
    const entity = entityMap.get(entityName)
    if (!entity) continue
    const escapedName = entityName.replace(
      /[.*+?^${}()|[\]\\]/g,
      EntityAutoLinkerRegexReplacement.EscapedMatch
    )
    const pattern = new RegExp(
      `(?<!\\[)\\b(${escapedName})\\b(?!\\]\\[)`,
      EntityAutoLinkerRegexFlag.GlobalCaseInsensitive
    )
    let match
    while ((match = pattern.exec(text)) !== null) {
      if (isInsideExistingRef(match.index, match.index + match[1].length)) continue
      matches.push({
        name: match[1],
        id: entity.id,
        type: entity.type,
        startIndex: match.index,
        endIndex: match.index + match[1].length,
      })
    }
  }
  return matches
}

/** Drop overlaps and rewrite matched names as [name][id] references (end-to-start). */
function linkMatches(text: string, matches: EntityMatch[]): string {
  // Descending start index so replacements don't shift later indices.
  matches.sort((a, b) => b.startIndex - a.startIndex)

  const nonOverlapping: EntityMatch[] = []
  for (const match of matches) {
    const overlaps = nonOverlapping.some(
      existing =>
        (match.startIndex >= existing.startIndex && match.startIndex < existing.endIndex) ||
        (match.endIndex > existing.startIndex && match.endIndex <= existing.endIndex)
    )
    if (!overlaps) nonOverlapping.push(match)
  }

  let result = text
  for (const match of nonOverlapping) {
    const before = result.slice(0, match.startIndex)
    const after = result.slice(match.endIndex)
    result = `${before}[${match.name}][${match.id}]${after}`
  }

  if (nonOverlapping.length > 0) {
    console.log(`🔗 [AutoLinker] Linked ${nonOverlapping.length} entities in generated text`)
  }
  return result
}

async function loadProjectEntityMap(projectId: string): Promise<Map<string, EntityRef> | null> {
  const { db } = await import('@/db/client')
  const { projects, storyPlans, characters } = await import('@/db')
  const { eq } = await import('drizzle-orm')

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  })
  if (!project) return null

  let storyPlan = parseStoryPlanRecord(project.storyPlan)
  if (Object.keys(storyPlan).length === 0) {
    const sp = await db.query.storyPlans.findFirst({
      where: eq(storyPlans.projectId, projectId),
    })
    if (sp?.content) {
      storyPlan = parseStoryPlanRecord(sp.content)
    }
  }

  const projectCharacters = await db.query.characters.findMany({
    where: eq(characters.projectId, projectId),
  })
  const cast = (projectCharacters || []).map(recordFromJson)
  const entityMap = buildEntityMap(storyPlan, cast)
  return entityMap.size === 0 ? null : entityMap
}

function linkTextWithMap(entityMap: Map<string, EntityRef>): (text: string) => Promise<string> {
  return async (text: string) => {
    const matches = collectEntityMatches(text, entityMap)
    if (matches.length === 0) return text
    return linkMatches(text, matches)
  }
}

async function createProjectTextLinker(
  projectId: string
): Promise<(text: string) => Promise<string>> {
  try {
    const entityMap = await loadProjectEntityMap(projectId)
    if (!entityMap) return async text => text
    return linkTextWithMap(entityMap)
  } catch (error) {
    console.warn(EntityAutoLinkerLog.FailedAutoLink, error)
    return async text => text
  }
}

/**
 * Auto-link entity names in text to entity references
 *
 * @param text - Generated text that may contain plain entity names
 * @param projectId - Project ID to fetch entities from
 * @returns Text with entity names converted to references
 */
export async function autoLinkEntities(text: string, projectId: string): Promise<string> {
  if (!text || !projectId) return text
  const linked = await autoLinkUnknown(text, projectId)
  return typeof linked === 'string' ? linked : text
}

export async function autoLinkUnknown(value: unknown, projectId: string): Promise<unknown> {
  if (!projectId) return value
  const linkText = await createProjectTextLinker(projectId)
  return mapLinkedValue(value, linkText, ENTITY_AUTO_LINKER_MIN_STRING_LENGTH)
}

export const entityAutoLinker = {
  autoLink: autoLinkEntities,
  autoLinkUnknown,
}
