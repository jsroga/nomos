import { recordFromJson, readString, stringArrayFromJson } from '@/shared/data/json-guards'
import { EntityKind } from './constants'
import type { CastPerson, LexiconEntry, MatchingRules, PhraseHit } from './types'

const REGEX_ESCAPE = /[.*+?^${}()|[\]\\]/g
const LEADING_THE = /^the\s+/i

export function matchingRulesFromUnknown(value: unknown): MatchingRules {
  const row = recordFromJson(value)
  return {
    caseInsensitive: row.caseInsensitive === true,
    ignoreLeadingThe: row.ignoreLeadingThe === true,
    singularPlural: row.singularPlural === true,
    explicitAliases: row.explicitAliases === true,
    wholePhraseWordBoundaries: row.wholePhraseWordBoundaries === true,
  }
}

export function lexiconEntriesFromUnknown(value: unknown): LexiconEntry[] {
  const byKind = recordFromJson(recordFromJson(value).byKind)
  const entries: LexiconEntry[] = []
  for (const kind of Object.values(EntityKind)) {
    const list = byKind[kind]
    if (!Array.isArray(list)) continue
    for (const item of list) {
      const row = recordFromJson(item)
      const term = readString(row.term)
      if (!term) continue
      entries.push({
        term,
        aliases: stringArrayFromJson(row.aliases),
        kind,
      })
    }
  }
  return entries
}

export function castPeopleFromUnknown(value: unknown): CastPerson[] {
  const people = recordFromJson(value).people
  if (!Array.isArray(people)) return []
  const out: CastPerson[] = []
  for (const item of people) {
    const row = recordFromJson(item)
    const name = readString(row.name)
    if (!name) continue
    out.push({
      name,
      aliases: stringArrayFromJson(row.aliases),
      psychology: recordFromJson(row.psychology),
    })
  }
  return out
}

function escapeRegex(value: string): string {
  return value.replace(REGEX_ESCAPE, '\\$&')
}

function lastWordVariants(word: string, rules: MatchingRules): string[] {
  if (!rules.singularPlural) return [word]
  const variants = [word]
  if (word.endsWith('s') && word.length > 2) variants.push(word.slice(0, -1))
  else variants.push(`${word}s`)
  return variants
}

function phraseVariants(phrase: string, rules: MatchingRules): string[] {
  const trimmed = phrase.trim()
  if (trimmed.length === 0) return []
  const stripped = rules.ignoreLeadingThe ? trimmed.replace(LEADING_THE, '') : trimmed
  const words = stripped.split(/\s+/).filter(word => word.length > 0)
  const last = words[words.length - 1]
  if (!last) return []
  const head = words.slice(0, -1)
  return lastWordVariants(last, rules).map(variant => [...head, variant].join(' '))
}

function phrasesForEntry(term: string, aliases: string[], rules: MatchingRules): string[] {
  const seeds = [term]
  if (rules.explicitAliases) seeds.push(...aliases)
  const expanded = seeds.flatMap(seed => phraseVariants(seed, rules))
  return [...new Set(expanded)]
}

function compilePhrase(phrase: string, rules: MatchingRules): RegExp {
  const flags = rules.caseInsensitive ? 'gi' : 'g'
  const body = escapeRegex(phrase).replace(/\s+/g, '\\s+')
  const thePrefix = rules.ignoreLeadingThe ? '(?:the\\s+)?' : ''
  const wrapped = rules.wholePhraseWordBoundaries ? `\\b${thePrefix}${body}\\b` : `${thePrefix}${body}`
  return new RegExp(wrapped, flags)
}

interface PreparedPhrase {
  term: string
  kind: EntityKind
  pattern: RegExp
  length: number
}

function preparePhrases(
  entries: ReadonlyArray<{ term: string; aliases: string[]; kind: EntityKind }>,
  rules: MatchingRules,
): PreparedPhrase[] {
  const prepared: PreparedPhrase[] = []
  for (const entry of entries) {
    for (const phrase of phrasesForEntry(entry.term, entry.aliases, rules)) {
      prepared.push({
        term: entry.term,
        kind: entry.kind,
        pattern: compilePhrase(phrase, rules),
        length: phrase.length,
      })
    }
  }
  prepared.sort((a, b) => b.length - a.length)
  return prepared
}

function overlaps(start: number, end: number, hits: PhraseHit[]): boolean {
  return hits.some(hit => start < hit.end && end > hit.start)
}

export function findPhraseHits(
  text: string,
  entries: ReadonlyArray<{ term: string; aliases: string[]; kind: EntityKind }>,
  rules: MatchingRules,
): PhraseHit[] {
  const hits: PhraseHit[] = []
  for (const prepared of preparePhrases(entries, rules)) {
    prepared.pattern.lastIndex = 0
    let match = prepared.pattern.exec(text)
    while (match) {
      const matchedString = match[0]
      const start = match.index
      const end = start + matchedString.length
      if (!overlaps(start, end, hits)) {
        hits.push({ start, end, matchedString, term: prepared.term, kind: prepared.kind })
      }
      if (matchedString.length === 0) break
      match = prepared.pattern.exec(text)
    }
  }
  hits.sort((a, b) => a.start - b.start)
  return hits
}

export function maskSpans(text: string, hits: readonly PhraseHit[]): string {
  const ordered = [...hits].sort((a, b) => b.start - a.start)
  let masked = text
  for (const hit of ordered) {
    const width = Math.max(0, hit.end - hit.start)
    masked = `${masked.slice(0, hit.start)}${' '.repeat(width)}${masked.slice(hit.end)}`
  }
  return masked
}
