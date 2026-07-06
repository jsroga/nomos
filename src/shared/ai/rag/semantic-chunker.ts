/**
 * Semantic Chunker
 *
 * Splits documents into semantically meaningful chunks with:
 * - Configurable chunk size and overlap
 * - Structure preservation (paragraphs, sections)
 * - Metadata extraction (headings, entities)
 * - Citation-ready chunk IDs
 */

import { v4 as uuidv4 } from 'uuid'

export interface ChunkConfig {
  maxChunkSize: number // Target chunk size in tokens (approximate)
  overlapSize: number // Token overlap between chunks
  minChunkSize: number // Minimum chunk size to avoid tiny chunks
  preserveStructure: boolean // Respect paragraph/section boundaries
}

export interface DocumentChunk {
  id: string // UUID for citation tracking
  content: string // The chunk text
  metadata: {
    documentId: string // Parent document ID
    projectId: string
    documentType: string
    chunkIndex: number // Position in document
    totalChunks: number
    headings: string[] // Section hierarchy
    entities: string[] // Extracted entities
    charStart: number // Start position in original doc
    charEnd: number // End position in original doc
    timestamp: Date
  }
}

// Document type specific configurations
const DOCUMENT_TYPE_CONFIGS: Record<string, Partial<ChunkConfig>> = {
  world_rule: { maxChunkSize: 256, overlapSize: 25, minChunkSize: 50 },
  character_arc: { maxChunkSize: 512, overlapSize: 50, minChunkSize: 100 },
  beat_decision: { maxChunkSize: 1024, overlapSize: 0, minChunkSize: 50 },
  episode_summary: { maxChunkSize: 1024, overlapSize: 100, minChunkSize: 200 },
  user_feedback: { maxChunkSize: 512, overlapSize: 0, minChunkSize: 50 },
  agent_reasoning: { maxChunkSize: 512, overlapSize: 50, minChunkSize: 100 },
  game_reference: { maxChunkSize: 512, overlapSize: 50, minChunkSize: 100 },
  design_pattern: { maxChunkSize: 768, overlapSize: 75, minChunkSize: 150 },
  mechanic_template: { maxChunkSize: 512, overlapSize: 50, minChunkSize: 100 },
}

const DEFAULT_CONFIG: ChunkConfig = {
  maxChunkSize: 512,
  overlapSize: 50,
  minChunkSize: 100,
  preserveStructure: true,
}

// Approximate tokens per character (English text average)
const CHARS_PER_TOKEN = 4

/**
 * Estimate token count from text
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

/**
 * Extract headings from text
 */
function extractHeadings(text: string): string[] {
  const headings: string[] = []

  // Markdown headings
  const mdHeadings = text.match(/^#{1,6}\s+(.+)$/gm)
  if (mdHeadings) {
    headings.push(...mdHeadings.map(h => h.replace(/^#+\s+/, '').trim()))
  }

  // Bold text at start of line (often used as headings)
  const boldHeadings = text.match(/^\*\*(.+?)\*\*/gm)
  if (boldHeadings) {
    headings.push(...boldHeadings.map(h => h.replace(/\*\*/g, '').trim()))
  }

  return [...new Set(headings)] // Deduplicate
}

/**
 * Extract named entities (characters, locations, etc.)
 */
function extractEntities(text: string): string[] {
  const entities: string[] = []

  // Capitalized words that might be names (simple heuristic)
  const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g
  const matches = text.match(capitalizedPattern)

  if (matches) {
    // Filter out common words and keep unique
    const commonWords = new Set([
      'The',
      'This',
      'That',
      'These',
      'Those',
      'There',
      'Here',
      'What',
      'When',
      'Where',
      'Who',
      'Why',
      'How',
      'And',
      'But',
      'Or',
      'If',
      'Then',
      'So',
      'Because',
      'Chapter',
      'Section',
      'Part',
      'Episode',
      'Scene',
    ])

    const filtered = matches.filter(m => !commonWords.has(m) && m.length > 2)
    entities.push(...new Set(filtered))
  }

  return entities.slice(0, 20) // Limit to 20 entities
}

/**
 * Split text at sentence boundaries
 */
function splitAtSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by space or newline
  const sentences = text.split(/(?<=[.!?])\s+/)
  return sentences.filter(s => s.trim().length > 0)
}

/**
 * Split text at paragraph boundaries
 */
function splitAtParagraphs(text: string): string[] {
  // Split on double newlines or markdown section breaks
  const paragraphs = text.split(/\n\n+|(?=^#{1,6}\s)/m)
  return paragraphs.filter(p => p.trim().length > 0)
}

/**
 * Semantic chunker class
 */
export class SemanticChunker {
  private config: ChunkConfig

  constructor(config?: Partial<ChunkConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Get config for a specific document type
   */
  getConfigForType(documentType: string): ChunkConfig {
    const typeConfig = DOCUMENT_TYPE_CONFIGS[documentType] || {}
    return { ...this.config, ...typeConfig }
  }

  /**
   * Chunk a document into semantically meaningful pieces
   */
  chunkDocument(
    content: string,
    metadata: {
      documentId: string
      projectId: string
      documentType: string
    }
  ): DocumentChunk[] {
    const config = this.getConfigForType(metadata.documentType)
    const chunks: DocumentChunk[] = []

    // Handle empty or very short content
    if (!content || content.trim().length === 0) {
      return []
    }

    const totalTokens = estimateTokens(content)

    // If content fits in one chunk, return as single chunk
    if (totalTokens <= config.maxChunkSize) {
      return [
        {
          id: uuidv4(),
          content: content.trim(),
          metadata: {
            ...metadata,
            chunkIndex: 0,
            totalChunks: 1,
            headings: extractHeadings(content),
            entities: extractEntities(content),
            charStart: 0,
            charEnd: content.length,
            timestamp: new Date(),
          },
        },
      ]
    }

    // Split into paragraphs first if preserving structure
    let segments: string[]
    if (config.preserveStructure) {
      segments = splitAtParagraphs(content)
    } else {
      segments = splitAtSentences(content)
    }

    // Build chunks from segments
    let currentChunk = ''
    let currentStart = 0
    let charPosition = 0

    for (const segment of segments) {
      const segmentTokens = estimateTokens(segment)
      const currentTokens = estimateTokens(currentChunk)

      // If adding this segment exceeds max size, finalize current chunk
      if (currentTokens + segmentTokens > config.maxChunkSize && currentChunk.length > 0) {
        // Only add if meets minimum size
        if (currentTokens >= config.minChunkSize || chunks.length === 0) {
          chunks.push({
            id: uuidv4(),
            content: currentChunk.trim(),
            metadata: {
              ...metadata,
              chunkIndex: chunks.length,
              totalChunks: 0, // Will update later
              headings: extractHeadings(currentChunk),
              entities: extractEntities(currentChunk),
              charStart: currentStart,
              charEnd: charPosition,
              timestamp: new Date(),
            },
          })
        }

        // Start new chunk with overlap
        if (config.overlapSize > 0) {
          // Get last N characters for overlap
          const overlapChars = config.overlapSize * CHARS_PER_TOKEN
          currentChunk = currentChunk.slice(-overlapChars) + '\n\n' + segment
          currentStart = charPosition - overlapChars
        } else {
          currentChunk = segment
          currentStart = charPosition
        }
      } else {
        // Add segment to current chunk
        if (currentChunk.length > 0) {
          currentChunk += '\n\n' + segment
        } else {
          currentChunk = segment
        }
      }

      charPosition += segment.length + 2 // +2 for \n\n
    }

    // Add final chunk
    if (currentChunk.trim().length > 0) {
      const currentTokens = estimateTokens(currentChunk)
      if (currentTokens >= config.minChunkSize || chunks.length === 0) {
        chunks.push({
          id: uuidv4(),
          content: currentChunk.trim(),
          metadata: {
            ...metadata,
            chunkIndex: chunks.length,
            totalChunks: 0,
            headings: extractHeadings(currentChunk),
            entities: extractEntities(currentChunk),
            charStart: currentStart,
            charEnd: content.length,
            timestamp: new Date(),
          },
        })
      } else if (chunks.length > 0) {
        // Merge with previous chunk if too small
        const lastChunk = chunks[chunks.length - 1]
        lastChunk.content += '\n\n' + currentChunk.trim()
        lastChunk.metadata.charEnd = content.length
        lastChunk.metadata.headings = [
          ...lastChunk.metadata.headings,
          ...extractHeadings(currentChunk),
        ]
        lastChunk.metadata.entities = [
          ...new Set([...lastChunk.metadata.entities, ...extractEntities(currentChunk)]),
        ]
      }
    }

    // Update total chunks count
    for (const chunk of chunks) {
      chunk.metadata.totalChunks = chunks.length
    }

    return chunks
  }

  /**
   * Chunk multiple documents
   */
  chunkDocuments(
    documents: Array<{
      content: string
      documentId: string
      projectId: string
      documentType: string
    }>
  ): DocumentChunk[] {
    return documents.flatMap(doc => this.chunkDocument(doc.content, doc))
  }
}

// Singleton instance
let chunkerInstance: SemanticChunker | null = null

export function getSemanticChunker(config?: Partial<ChunkConfig>): SemanticChunker {
  if (!chunkerInstance) {
    chunkerInstance = new SemanticChunker(config)
  }
  return chunkerInstance
}

export { DEFAULT_CONFIG, DOCUMENT_TYPE_CONFIGS }
