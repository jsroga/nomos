/**
 * Deterministic claim-check between source draft and humanized text.
 * Quotes, integers/decimals, and ISO-ish dates must survive. Proper names are not checked.
 */

export enum ClaimCheckKind {
  Quote = 'quote',
  Number = 'number',
  Date = 'date',
}

export interface ClaimToken {
  readonly kind: ClaimCheckKind
  readonly value: string
}

export interface ClaimCheckResult {
  readonly ok: boolean
  readonly missing: readonly ClaimToken[]
  readonly altered: readonly ClaimToken[]
}

/** Double- or single-quoted spans (non-greedy, no cross-line). */
const QUOTE_RE = /"([^"\n]{1,500})"|'([^'\n]{1,500})'/g

/** Integers and decimals; skip lone years already caught as dates when ISO-shaped. */
const NUMBER_RE = /(?<![A-Za-z0-9_/])-?\d+(?:\.\d+)?(?![A-Za-z0-9_/])/g

/** ISO-ish calendar dates: YYYY-MM-DD or YYYY/MM/DD. */
const DATE_RE = /\b\d{4}[-/]\d{2}[-/]\d{2}\b/g

function collectQuotes(text: string): ClaimToken[] {
  const tokens: ClaimToken[] = []
  for (const match of text.matchAll(QUOTE_RE)) {
    const inner = match[1] ?? match[2]
    if (inner !== undefined && inner.length > 0) {
      tokens.push({ kind: ClaimCheckKind.Quote, value: inner })
    }
  }
  return tokens
}

function collectNumbers(text: string): ClaimToken[] {
  const withoutDates = text.replace(DATE_RE, ' ')
  const tokens: ClaimToken[] = []
  for (const match of withoutDates.matchAll(NUMBER_RE)) {
    tokens.push({ kind: ClaimCheckKind.Number, value: match[0] })
  }
  return tokens
}

function collectDates(text: string): ClaimToken[] {
  return [...text.matchAll(DATE_RE)].map(match => ({
    kind: ClaimCheckKind.Date,
    value: match[0],
  }))
}

export function extractClaimTokens(text: string): ClaimToken[] {
  return [...collectQuotes(text), ...collectNumbers(text), ...collectDates(text)]
}

function multiset(tokens: readonly ClaimToken[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const token of tokens) {
    const key = `${token.kind}:${token.value}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

function parseKey(key: string): ClaimToken {
  const sep = key.indexOf(':')
  const kindRaw = key.slice(0, sep)
  const value = key.slice(sep + 1)
  const kind =
    kindRaw === ClaimCheckKind.Quote
      ? ClaimCheckKind.Quote
      : kindRaw === ClaimCheckKind.Date
        ? ClaimCheckKind.Date
        : ClaimCheckKind.Number
  return { kind, value }
}

/**
 * Source facts must appear unchanged in the humanized text (multiset equality on
 * quotes, numbers, and dates). Cadence-only rewrites pass; digit/quote edits fail.
 */
export function claimCheckBeat(sourceDraft: string, humanized: string): ClaimCheckResult {
  const sourceCounts = multiset(extractClaimTokens(sourceDraft))
  const humanCounts = multiset(extractClaimTokens(humanized))
  const missing: ClaimToken[] = []
  const altered: ClaimToken[] = []

  for (const [key, count] of sourceCounts) {
    const found = humanCounts.get(key) ?? 0
    if (found < count) {
      const token = parseKey(key)
      for (let i = 0; i < count - found; i++) missing.push(token)
    }
  }

  for (const [key, count] of humanCounts) {
    if (!sourceCounts.has(key)) {
      const token = parseKey(key)
      for (let i = 0; i < count; i++) altered.push(token)
    }
  }

  return {
    ok: missing.length === 0 && altered.length === 0,
    missing,
    altered,
  }
}
