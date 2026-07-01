/**
 * Reference Parser Utility
 *
 * Parses entity references in MD-style format: [Display Name][entity-type-uuid]
 * Used by UI components for rendering and by context assembler for smart context.
 *
 * NOTE: This module is client-safe and does not import server-only code.
 */

// Entity types supported by the reference system (duplicated to keep this client-safe)
export type EntityType = 'character' | 'place' | 'event' | 'faction' | 'rule' | 'beat' | 'episode' | 'item'

// Entity type prefixes for reference IDs
export const ENTITY_PREFIXES: Record<EntityType, string> = {
  character: 'char',
  place: 'place',
  event: 'event',
  faction: 'faction',
  rule: 'rule',
  beat: 'beat',
  episode: 'ep',
  item: 'item',
}

// Reverse lookup: prefix -> type
export const PREFIX_TO_TYPE: Record<string, EntityType> = Object.entries(ENTITY_PREFIXES).reduce(
  (acc, [type, prefix]) => ({ ...acc, [prefix]: type as EntityType }),
  {} as Record<string, EntityType>
)

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
  | { type: 'text'; content: string }
  | { type: 'reference'; ref: ParsedReference }

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

/**
 * Parse all references from text
 */
export function parseReferences(text: string): ParsedReference[] {
  const refs: ParsedReference[] = []
  const pattern = new RegExp(REFERENCE_REGEX.source, 'g')
  let match

  while ((match = pattern.exec(text)) !== null) {
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
  const refs = parseReferences(text)

  if (refs.length === 0) {
    return [{ type: 'text', content: text }]
  }

  let lastIndex = 0

  for (const ref of refs) {
    // Add text before this reference
    if (ref.startIndex > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, ref.startIndex),
      })
    }

    // Add the reference
    segments.push({
      type: 'reference',
      ref,
    })

    lastIndex = ref.endIndex
  }

  // Add remaining text after last reference
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    })
  }

  return segments
}

/**
 * Replace references with just display names (for plain text output)
 */
export function stripReferences(text: string): string {
  return text.replace(REFERENCE_REGEX, '$1')
}

/**
 * Check if text contains any references
 */
export function hasReferences(text: string): boolean {
  return new RegExp(REFERENCE_REGEX.source).test(text)
}

/**
 * Create a reference ID from type and short ID
 */
export function createRefId(type: EntityType, shortId: string): string {
  const prefix = ENTITY_PREFIXES[type]
  return `${prefix}-${shortId}`
}

