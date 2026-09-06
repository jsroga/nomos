import '@/shared/data/server-guard'

export enum ManuscriptSearchSource {
  Beat = 'beat',
  Script = 'script',
  Setup = 'setup',
  Character = 'character',
}

export interface ManuscriptSearchDoc {
  source: ManuscriptSearchSource
  id: string
  text: string
}

export interface ManuscriptSearchHit {
  source: ManuscriptSearchSource
  id: string
  snippet: string
}

export interface CharacterNameRow {
  id: string
  name: string
}

enum SearchNormalize {
  Space = ' ',
}

enum SnippetWindow {
  Radius = 40,
}

function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/\s+/g, SearchNormalize.Space).trim()
}

export function snippetAround(text: string, query: string): string {
  const haystack = normalizeForMatch(text)
  const needle = normalizeForMatch(query)
  const index = haystack.indexOf(needle)
  if (index < 0) return text.trim().slice(0, SnippetWindow.Radius * 2)
  const start = Math.max(0, index - SnippetWindow.Radius)
  const end = Math.min(text.length, index + needle.length + SnippetWindow.Radius)
  return text.slice(start, end).trim()
}

export function literalManuscriptHits(
  docs: readonly ManuscriptSearchDoc[],
  query: string
): ManuscriptSearchHit[] {
  const needle = normalizeForMatch(query)
  if (needle.length === 0) return []
  const hits: ManuscriptSearchHit[] = []
  for (const doc of docs) {
    if (!normalizeForMatch(doc.text).includes(needle)) continue
    hits.push({
      source: doc.source,
      id: doc.id,
      snippet: snippetAround(doc.text, query),
    })
  }
  return hits
}

export function characterNameCollisions(
  characters: readonly CharacterNameRow[],
  query: string
): CharacterNameRow[] {
  const needle = normalizeForMatch(query)
  if (needle.length === 0) return []
  const matches = characters.filter(row => normalizeForMatch(row.name).includes(needle))
  if (matches.length < 2) return []
  return matches
}
