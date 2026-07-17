import { InspirationItem } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import { recordArrayFromJson, recordFromJson, readString } from '@/shared/data/json-guards'
import {
  BIBLE_INSPIRATION_GAME_KEYWORDS,
  BIBLE_INSPIRATION_GAME_YEAR_PATTERN,
  BIBLE_INSPIRATION_MOVIE_KEYWORDS,
  BIBLE_INSPIRATION_MOVIE_YEAR_PATTERN,
  BIBLE_INSPIRATION_TITLE_SEPARATOR,
} from '../constants/bible-inspirations'
import { BibleInspirationCategoryKey } from '../constants/bible-section-ui'

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

function categorizeFlatInspiration(item: unknown): InspirationItem {
  if (typeof item === 'string') return { title: item, description: '' }
  const row = recordFromJson(item)
  const title = readString(row.title) ?? ''
  const description = readString(row.description) ?? ''
  return { title, description }
}

function inspirationCategoryFromTitle(title: string): BibleInspirationCategoryKey {
  const titleLower = title.toLowerCase()
  if (
    BIBLE_INSPIRATION_GAME_KEYWORDS.some(keyword => titleLower.includes(keyword)) ||
    BIBLE_INSPIRATION_GAME_YEAR_PATTERN.test(titleLower)
  ) {
    return BibleInspirationCategoryKey.Games
  }
  if (
    BIBLE_INSPIRATION_MOVIE_KEYWORDS.some(keyword => titleLower.includes(keyword)) ||
    BIBLE_INSPIRATION_MOVIE_YEAR_PATTERN.test(titleLower)
  ) {
    return BibleInspirationCategoryKey.Movies
  }
  return BibleInspirationCategoryKey.Books
}

function categorizedInspirationsFromObject(raw: unknown): InspirationCategories {
  const categorized = recordFromJson(raw)
  return {
    books: inspirationItemsFromJson(categorized.books),
    movies: inspirationItemsFromJson(categorized.movies),
    games: inspirationItemsFromJson(categorized.games),
  }
}

function categorizedInspirationsFromArray(raw: unknown[]): InspirationCategories {
  const result: InspirationCategories = { books: [], movies: [], games: [] }
  for (const item of raw) {
    const normalized = categorizeFlatInspiration(item)
    const category = inspirationCategoryFromTitle(normalized.title)
    result[category].push(normalized)
  }
  return result
}

export function normalizeInspirations(raw: unknown): InspirationCategories {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return categorizedInspirationsFromObject(raw)
  }
  if (Array.isArray(raw)) {
    return categorizedInspirationsFromArray(raw)
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
