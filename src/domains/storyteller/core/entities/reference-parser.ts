/**
 * Reference Parser Utility
 *
 * Parses entity references in MD-style format: [Display Name][entity-type-uuid]
 * Used by UI components for rendering and by context assembler for smart context.
 *
 * NOTE: This module is client-safe and does not import server-only code.
 */

import {
  ENTITY_PREFIXES,
  EntityMarkdownHref,
  PREFIX_TO_TYPE,
  REFERENCE_DISPLAY_CAPTURE,
  ReferenceSegmentType,
  type EntityType,
} from '@/domains/storyteller/core/entities/constants/reference-parser'
import { encodePathSegment } from '@/shared/data/url-builder'

export type { EntityType }
export { ENTITY_PREFIXES, EntityMarkdownHref, PREFIX_TO_TYPE }

/**
 * Parsed reference from text
 */
export interface ParsedReference {
  /** Full match including brackets */
  fullMatch: string
  /** Display name shown to user */
  displayName: string
  /** Reference ID (e.g., "char-abc123") */
  refId: string
  /** Entity type derived from prefix */
  type: EntityType | null
  /** Start index in original text */
  startIndex: number
  /** End index in original text */
  endIndex: number
}

/**
 * Text segment - either plain text or a reference
 */
export type TextSegment =
  | { type: ReferenceSegmentType.Text; content: string }
  | { type: ReferenceSegmentType.Reference; ref: ParsedReference }

/**
 * Reference pattern for parsing entity references from text
 * Matches: [Display Name][entity-type-uuid]
 * Groups: [1] = Display Name, [2] = Full ID (e.g., char-abc123)
 *
 * Pattern breakdown:
 * - \[([^\]]+)\] = Display name in brackets (any text except ])
 * - \[([^\]\s]+)\] = Entity ID in brackets (any non-whitespace, non-bracket chars)
 */
const REFERENCE_REGEX = /\[([^\]]+)\]\[([^\]\s]+)\]/g
const ESCAPED_MARKDOWN_BRACKET = /\\([\[\]])/g

export function unescapeMarkdownEntityBrackets(text: string): string {
  return text.replace(ESCAPED_MARKDOWN_BRACKET, (_full, bracket: string) => bracket)
}

function referenceSource(text: string): string {
  return unescapeMarkdownEntityBrackets(text)
}

/**
 * Parse all references from text
 */
export function parseReferences(text: string): ParsedReference[] {
  const refs: ParsedReference[] = []
  const source = referenceSource(text)
  const pattern = new RegExp(REFERENCE_REGEX.source, 'g')
  let match

  while ((match = pattern.exec(source)) !== null) {
    const refId = match[2]
    const prefix = refId.split('-')[0]

    refs.push({
      fullMatch: match[0],
      displayName: match[1],
      refId,
      type: PREFIX_TO_TYPE[prefix] || null,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    })
  }

  return refs
}

/**
 * Split text into segments of plain text and references
 * Useful for rendering with React components
 */
export function splitIntoSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  const source = referenceSource(text)
  const refs = parseReferences(source)

  if (refs.length === 0) {
    return [{ type: ReferenceSegmentType.Text, content: source }]
  }

  let lastIndex = 0

  for (const ref of refs) {
    if (ref.startIndex > lastIndex) {
      segments.push({
        type: ReferenceSegmentType.Text,
        content: source.slice(lastIndex, ref.startIndex),
      })
    }

    segments.push({
      type: ReferenceSegmentType.Reference,
      ref,
    })

    lastIndex = ref.endIndex
  }

  if (lastIndex < source.length) {
    segments.push({
      type: ReferenceSegmentType.Text,
      content: source.slice(lastIndex),
    })
  }

  return segments
}

export function stripReferences(text: string): string {
  return referenceSource(text).replace(
    new RegExp(REFERENCE_REGEX.source, 'g'),
    REFERENCE_DISPLAY_CAPTURE,
  )
}

export function hasReferences(text: string): boolean {
  return new RegExp(REFERENCE_REGEX.source).test(referenceSource(text))
}

export function rewriteEntityRefsToMarkdownLinks(text: string): string {
  return referenceSource(text).replace(
    new RegExp(REFERENCE_REGEX.source, 'g'),
    (_full, display: string, refId: string) =>
      `[${display}](${EntityMarkdownHref.Prefix}${encodePathSegment(refId)})`,
  )
}

export function entityRefIdFromHref(href: string | undefined): string | null {
  if (!href || !href.startsWith(EntityMarkdownHref.Prefix)) return null
  const encoded = href.slice(EntityMarkdownHref.Prefix.length)
  if (!encoded) return null
  try {
    return decodeURIComponent(encoded)
  } catch {
    return encoded
  }
}

/**
 * Create a reference ID from type and short ID
 */
export function createRefId(type: EntityType, shortId: string): string {
  const prefix = ENTITY_PREFIXES[type]
  return `${prefix}-${shortId}`
}
