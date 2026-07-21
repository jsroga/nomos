import type { beats, characters } from '@/db'
import type { StoryPlan } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import { parseStoryPlanJson } from '@/domains/storyteller/core/io/project-jsonb'
import {
  namedRecordsFromJson,
  recordArrayFromJson,
  recordFromJson,
  readString,
} from '@/shared/data/json-guards'
import { ContextAssemblyFallback } from '@/domains/storyteller/services/constants/context-assembly'

export type { StoryPlan }

type CharacterRow = typeof characters.$inferSelect

export interface Character {
  id: string
  name: string
  role?: string
  description?: string
  psychology?: Record<string, unknown>
}

interface WorldRuleRow {
  id?: string
  name?: string
  category?: string
  rule: string
  consequence?: string
}

interface FactionRow {
  id?: string
  name: string
  ideology?: string
  description?: string
}

interface NamedEntityRow {
  id?: string
  name: string
  description?: string
}

export type BeatRow = typeof beats.$inferSelect

export function characterFromDbRow(row: CharacterRow): Character {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    description: row.description ?? undefined,
  }
}

function characterFromPlanRow(row: Record<string, unknown>): Character | null {
  const name = readString(row.name)
  if (!name) return null
  return {
    id: readString(row.id) ?? '',
    name,
    role: readString(row.role),
    description: readString(row.description),
    psychology: recordFromJson(row.psychology),
  }
}

export function charactersFromJson(value: unknown): Character[] {
  return recordArrayFromJson(value).flatMap(row => {
    const character = characterFromPlanRow(row)
    return character ? [character] : []
  })
}

function worldRulesFromJson(value: unknown): WorldRuleRow[] {
  return recordArrayFromJson(value).flatMap(row => {
    const rule = readString(row.rule)
    if (!rule) return []
    return [{
      id: readString(row.id),
      name: readString(row.name),
      category: readString(row.category),
      rule,
      consequence: readString(row.consequence),
    }]
  })
}

function factionsFromJson(value: unknown): FactionRow[] {
  return namedRecordsFromJson(value).map(row => ({
    id: readString(row.id),
    name: row.name,
    ideology: readString(row.ideology),
    description: readString(row.description),
  }))
}

function namedEntitiesFromJson(value: unknown): NamedEntityRow[] {
  return namedRecordsFromJson(value).map(row => ({
    id: readString(row.id),
    name: row.name,
    description: readString(row.description),
  }))
}

function inspirationTitle(item: unknown): string {
  if (typeof item === 'string') return item
  return readString(recordFromJson(item).title) ?? ContextAssemblyFallback.NoneLabel
}
export function storyPlanFromJson(content: unknown): Record<string, unknown> {
  const parsed = parseStoryPlanJson(content)
  if (parsed) return { ...parsed }

  const r = recordFromJson(content)
  const cast = charactersFromJson(r.cast)
  const keyCharacters = charactersFromJson(r.keyCharacters)

  return {
    cast: cast.length > 0 ? cast : undefined,
    keyCharacters: keyCharacters.length > 0 ? keyCharacters : undefined,
    premise: recordFromJson(r.premise),
    episodePremise: recordFromJson(r.episodePremise),
    worldDescription: readString(r.worldDescription),
    genre: Array.isArray(r.genre)
      ? r.genre.filter((g): g is string => typeof g === 'string')
      : readString(r.genre),
    tone: Array.isArray(r.tone)
      ? r.tone.filter((t): t is string => typeof t === 'string')
      : readString(r.tone),
    centralTheme: readString(r.centralTheme),
    worldRules: worldRulesFromJson(r.worldRules),
    factions: factionsFromJson(r.factions),
    items: namedEntitiesFromJson(r.items),
    events: namedEntitiesFromJson(r.events),
    inspirations: {
      movies: recordArrayFromJson(recordFromJson(r.inspirations).movies).map(inspirationTitle),
      books: recordArrayFromJson(recordFromJson(r.inspirations).books).map(inspirationTitle),
      games: recordArrayFromJson(recordFromJson(r.inspirations).games).map(inspirationTitle),
    },
    sequences: namedRecordsFromJson(r.sequences).map(row => ({
      name: row.name,
      description: readString(row.description),
    })),
    masterPrompt: readString(r.masterPrompt),
  }
}

export function flattenSeriesBible(
  rawBible: Record<string, unknown>,
  bibleCategoryKeys: readonly string[]
): Record<string, unknown> {
  const bibleCategorySet = new Set<string>(bibleCategoryKeys)
  const bible: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(rawBible)) {
    if (bibleCategorySet.has(key) && typeof value === 'object' && value !== null) {
      Object.assign(bible, recordFromJson(value))
    } else {
      bible[key] = value
    }
  }
  return bible
}

export function mergeCharactersFromPlanAndDb(
  dbCharacters: Character[],
  planCast: Character[]
): Character[] {
  const dbNames = new Set(dbCharacters.map(c => c.name.toLowerCase()))
  return [
    ...dbCharacters,
    ...planCast.filter(c => c.name && !dbNames.has(c.name.toLowerCase())),
  ]
}

export interface ProjectMeta {
  genre: string
  tone: string
  theme: string
  premise: Record<string, unknown>
}

export function deriveProjectMeta(
  storyPlan: Record<string, unknown>,
  bible: Record<string, unknown>,
  notSetLabel: string,
  commaSep: string,
): ProjectMeta {
  const genreValue = storyPlan.genre
  const genre = Array.isArray(genreValue)
    ? genreValue.filter((value): value is string => typeof value === 'string').join(commaSep)
    : readString(genreValue) || readString(bible.genre) || notSetLabel
  const toneValue = storyPlan.tone
  const tone = Array.isArray(toneValue)
    ? toneValue.filter((value): value is string => typeof value === 'string').join(commaSep)
    : readString(toneValue) || readString(bible.tone) || notSetLabel
  const theme =
    readString(storyPlan.centralQuestion) ||
    readString(storyPlan.centralTheme) ||
    readString(bible.centralTheme) ||
    readString(bible.centralQuestion) ||
    notSetLabel
  const premise =
    recordFromJson(storyPlan.premise ?? storyPlan.episodePremise ?? bible.episodePremise)
  return { genre, tone, theme, premise }
}

const ROLE_PRIORITY: Record<string, number> = {
  protagonist: 1,
  hero: 1,
  main: 1,
  antagonist: 2,
  villain: 2,
  mentor: 3,
  guide: 3,
  supporting: 4,
  side: 5,
}

export function sortCharactersByRole(characters: Character[]): Character[] {
  return [...characters].sort((a, b) => {
    const priorityA = ROLE_PRIORITY[(a.role || '').toLowerCase()] ?? 99
    const priorityB = ROLE_PRIORITY[(b.role || '').toLowerCase()] ?? 99
    return priorityA - priorityB
  })
}
