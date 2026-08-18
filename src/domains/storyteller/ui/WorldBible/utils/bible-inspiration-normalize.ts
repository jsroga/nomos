import { InspirationItem } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import { recordArrayFromJson, recordFromJson, readString } from '@/shared/data/json-guards'
import { BIBLE_INSPIRATION_TITLE_SEPARATOR } from '../constants/bible-inspirations'

export type InspirationCategories = {
  books: InspirationItem[]
  movies: InspirationItem[]
  games: InspirationItem[]
}

function inspirationItemFromWire(value: unknown): InspirationItem | null {
  if (typeof value === 'string') return { title: value, description: '' }
  const row = recordFromJson(value)
  const title = readString(row.title)
  if (!title) return null
  return { title, description: readString(row.description) ?? '' }
}

function inspirationItemsFromJson(value: unknown): InspirationItem[] {
  return recordArrayFromJson(value)
    .map(inspirationItemFromWire)
    .filter((item): item is InspirationItem => item !== null)
}

function categorizedInspirationsFromObject(raw: unknown): InspirationCategories {
  const categorized = recordFromJson(raw)
  return {
    books: inspirationItemsFromJson(categorized.books),
    movies: inspirationItemsFromJson(categorized.movies),
    games: inspirationItemsFromJson(categorized.games),
  }
}

export function normalizeInspirations(raw: unknown): InspirationCategories {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return categorizedInspirationsFromObject(raw)
  }
  return { books: [], movies: [], games: [] }
}

export function inspirationEditValue(
  items: Array<string | InspirationItem> | undefined
): string {
  return (items || [])
    .map(item => (typeof item === 'string' ? item : item.title))
    .join(BIBLE_INSPIRATION_TITLE_SEPARATOR)
}
