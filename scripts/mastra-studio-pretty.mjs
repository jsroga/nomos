/**
 * Unwrap JSON/markdown trapped in strings (Mastra Studio Step output).
 * Idempotent: a second pass returns the same value.
 */

const JSON_OBJECT_PREFIX = '{'
const JSON_ARRAY_PREFIX = '['
const ESCAPED_NEWLINE = '\\n'
const NEWLINE = '\n'

function looksLikeJsonContainer(value) {
  const trimmed = value.trim()
  return trimmed.startsWith(JSON_OBJECT_PREFIX) || trimmed.startsWith(JSON_ARRAY_PREFIX)
}

function tryParseJson(value) {
  try {
    return { ok: true, parsed: JSON.parse(value) }
  } catch {
    return { ok: false, parsed: undefined }
  }
}

function unescapeMarkdownNewlines(value) {
  if (!value.includes(ESCAPED_NEWLINE)) return value
  if (looksLikeJsonContainer(value)) return value
  return value.replaceAll(ESCAPED_NEWLINE, NEWLINE)
}

/**
 * Recursively parse string values that are JSON objects/arrays, then unescape
 * markdown newlines in remaining strings.
 */
export function prettyUnwrap(value) {
  if (typeof value === 'string') {
    if (looksLikeJsonContainer(value)) {
      const attempt = tryParseJson(value)
      if (attempt.ok) return prettyUnwrap(attempt.parsed)
    }
    return unescapeMarkdownNewlines(value)
  }
  if (Array.isArray(value)) return value.map(prettyUnwrap)
  if (value !== null && typeof value === 'object') {
    const next = {}
    for (const [key, child] of Object.entries(value)) {
      next[key] = prettyUnwrap(child)
    }
    return next
  }
  return value
}

export function prettyPrint(value) {
  const unwrapped = prettyUnwrap(value)
  if (typeof unwrapped === 'string') return unwrapped
  return JSON.stringify(unwrapped, null, 2)
}

export function prettyPrintText(raw) {
  const trimmed = raw.trim()
  if (!trimmed) return raw
  if (looksLikeJsonContainer(trimmed)) {
    const attempt = tryParseJson(trimmed)
    if (attempt.ok) return prettyPrint(attempt.parsed)
  }
  return prettyPrint(prettyUnwrap(trimmed))
}
