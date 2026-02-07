/**
 * Reference Parser Utility
 * 
 * Parses entity references in MD-style format: [Display Name][entity-type-uuid]
 * Used by UI components for rendering and by context assembler for smart context.
 * 
 * NOTE: This module is client-safe and does not import server-only code.
 */

// Entity types supported by the reference system (duplicated to keep this client-safe)
export type EntityType = 'character' | 'place' | 'event' | 'faction' | 'rule' | 'beat' | 'episode'

// Entity type prefixes for reference IDs
export const ENTITY_PREFIXES: Record<EntityType, string> = {
  character: 'char',
  place: 'place',
  event: 'event',
  faction: 'faction',
  rule: 'rule',
  beat: 'beat',
  episode: 'ep',
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
 * - \[([a-zA-Z0-9_-]+)\] = Entity ID in brackets (alphanumeric, underscores, hyphens)
 * 
 * Note: Hyphen must be at the end of character class or escaped to be literal
 */
const REFERENCE_REGEX = /\[([^\]]+)\]\[([a-zA-Z0-9_-]+)\]/g

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
 * Extract just the reference IDs from text
 */
export function extractRefIds(text: string): string[] {
  const refs = parseReferences(text)
  return [...new Set(refs.map(r => r.refId))]
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
 * Count references in text
 */
export function countReferences(text: string): number {
  return parseReferences(text).length
}

/**
 * Get unique entity types referenced in text
 */
export function getReferencedTypes(text: string): EntityType[] {
  const refs = parseReferences(text)
  const types = refs.map(r => r.type).filter((t): t is EntityType => t !== null)
  return [...new Set(types)]
}

/**
 * Format a reference for insertion into text
 */
export function formatReference(displayName: string, refId: string): string {
  return `[${displayName}][${refId}]`
}

/**
 * Create a reference ID from type and short ID
 */
export function createRefId(type: EntityType, shortId: string): string {
  const prefix = ENTITY_PREFIXES[type]
  return `${prefix}-${shortId}`
}

/**
 * Validate a reference ID format
 */
export function isValidRefId(refId: string): boolean {
  const parts = refId.split('-')
  if (parts.length < 2) return false

  const prefix = parts[0]
  return prefix in PREFIX_TO_TYPE
}

/**
 * Get entity type from reference ID
 */
export function getTypeFromRefId(refId: string): EntityType | null {
  const prefix = refId.split('-')[0]
  return PREFIX_TO_TYPE[prefix] || null
}

/**
 * Highlight references in text with HTML markup
 * Useful for debugging or simple rendering
 */
export function highlightReferences(
  text: string,
  wrapperTag: string = 'mark',
  className?: string
): string {
  const classAttr = className ? ` class="${className}"` : ''
  return text.replace(
    REFERENCE_REGEX,
    `<${wrapperTag}${classAttr} data-ref-id="$2">$1</${wrapperTag}>`
  )
}

/**
 * Convert references to markdown links
 * Useful for rendering in markdown-enabled contexts
 */
export function referencesToMarkdownLinks(text: string, baseUrl: string = '#entity'): string {
  return text.replace(
    REFERENCE_REGEX,
    (_, name, refId) => `[${name}](${baseUrl}/${refId})`
  )
}

/**
 * Batch replace references with resolved names
 * Useful when you have a map of refId -> resolved name
 */
export function replaceReferencesWithNames(
  text: string,
  nameMap: Map<string, string>
): string {
  return text.replace(REFERENCE_REGEX, (fullMatch, displayName, refId) => {
    const resolvedName = nameMap.get(refId)
    return resolvedName || displayName
  })
}
