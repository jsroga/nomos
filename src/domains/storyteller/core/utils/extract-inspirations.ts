/**
 * Recover structured inspirations from a chat answer so "Add to world" can
 * persist books / movies / games the agent only wrote as prose.
 *
 * Category comes only from section headers (MOVIES / BOOKS / GAMES), never from
 * title vocabulary.
 */

export interface ExtractedInspirationItem {
  title: string
  description: string
}

export interface ExtractedInspirations {
  books: ExtractedInspirationItem[]
  movies: ExtractedInspirationItem[]
  games: ExtractedInspirationItem[]
}

enum InspirationHeaderCategory {
  Movies = 'movies',
  Books = 'books',
  Games = 'games',
}

enum InspirationSectionHeader {
  Movies = 'MOVIES',
  Books = 'BOOKS',
  Games = 'GAMES',
}

/** Optional emoji / decoration, then MOVIES | BOOKS | GAMES. */
const SECTION_HEADER =
  /^(?:[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D]*\s*)?(MOVIES|BOOKS|GAMES)\b/iu

/** Optional list index, then title, em/en dash, description. */
const TITLE_AND_DESCRIPTION =
  /^\s*(?:\d+[.)]\s*)?(.+?)\s*[—–-]\s+(.+)\s*$/u

function emptyInspirations(): ExtractedInspirations {
  return { books: [], movies: [], games: [] }
}

function headerCategory(line: string): InspirationHeaderCategory | null {
  const match = SECTION_HEADER.exec(line.trim())
  if (!match) return null
  const label = match[1]?.toUpperCase()
  if (label === InspirationSectionHeader.Movies) return InspirationHeaderCategory.Movies
  if (label === InspirationSectionHeader.Books) return InspirationHeaderCategory.Books
  if (label === InspirationSectionHeader.Games) return InspirationHeaderCategory.Games
  return null
}

function parseItemLine(line: string): ExtractedInspirationItem | null {
  const match = TITLE_AND_DESCRIPTION.exec(line)
  if (!match) return null
  const title = match[1]?.trim() ?? ''
  const description = match[2]?.trim() ?? ''
  if (!title || !description) return null
  return { title, description }
}

export function extractInspirations(text: string): ExtractedInspirations {
  const result = emptyInspirations()
  let category: InspirationHeaderCategory | null = null

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const nextCategory = headerCategory(trimmed)
    if (nextCategory) {
      category = nextCategory
      continue
    }
    if (!category) continue

    const item = parseItemLine(trimmed)
    if (!item) continue
    result[category].push(item)
  }

  return result
}

export function hasExtractedInspirations(value: ExtractedInspirations): boolean {
  return value.books.length > 0 || value.movies.length > 0 || value.games.length > 0
}
