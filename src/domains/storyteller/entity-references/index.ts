/**
 * Entity References Module (CLIENT-SAFE EXPORTS ONLY)
 * 
 * Smart entity linking system that enables:
 * - MD-style references in LLM output: [Name][entity-type-id]
 * - Hover tooltips for entity details
 * - @ mention integration
 * - GraphRAG-based context assembly
 * 
 * IMPORTANT: This module only exports client-safe code.
 * For server-only imports, use the direct paths:
 * - entityRegistry: '@/domains/storyteller/services/entity-registry'
 * - entityGraphService: '@/domains/storyteller/services/entity-graph-service'
 * - assembleSmartContext: '@/domains/storyteller/context/assembler'
 * 
 * Usage:
 * 
 * // Parse references from text (client-safe)
 * import { parseReferences, extractRefIds } from '@/domains/storyteller/entity-references'
 * const refs = parseReferences("[Marcus][char-001] met [Sarah][char-002]")
 * 
 * // Render text with tooltips (client-safe)
 * import { ReferenceText } from '@/domains/storyteller/entity-references'
 * <ReferenceText text={llmOutput} projectId={id} onEntityClick={handleClick} />
 */

// Reference Parser Utilities (CLIENT-SAFE)
export {
  parseReferences,
  extractRefIds,
  splitIntoSegments,
  stripReferences,
  hasReferences,
  countReferences,
  getReferencedTypes,
  formatReference,
  createRefId,
  isValidRefId,
  getTypeFromRefId,
  highlightReferences,
  referencesToMarkdownLinks,
  replaceReferencesWithNames,
  type ParsedReference,
  type TextSegment,
} from '../utils/reference-parser'

// React Components (CLIENT-SAFE)
export {
  ReferenceText,
  useEntityReferences,
} from '../components/ReferenceText'

// Mention Provider Integration (CLIENT-SAFE)
export {
  entityRegistryProvider,
} from '../mentions/providers'
