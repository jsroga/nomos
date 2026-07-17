/**
 * Semantic Chunker
 *
 * Splits documents into semantically meaningful chunks with:
 * - Configurable chunk size and overlap
 * - Structure preservation (paragraphs, sections)
 * - Metadata extraction (headings, entities)
 * - Citation-ready chunk IDs
 */

import {
  assignTotalChunkCounts,
  createSingleChunk,
  estimateTokens,
  finalizeRemainingChunk,
  pushSegmentChunk,
  startNextSegmentWithOverlap,
} from './semantic-chunker-segments'

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

    if (!content || content.trim().length === 0) {
      return []
    }

    const totalTokens = estimateTokens(content)
    if (totalTokens <= config.maxChunkSize) {
      return createSingleChunk(content, metadata)
    }

    const segments = config.preserveStructure
      ? splitAtParagraphs(content)
      : splitAtSentences(content)

    let currentChunk = ''
    let currentStart = 0
    let charPosition = 0

    for (const segment of segments) {
      const segmentTokens = estimateTokens(segment)
      const currentTokens = estimateTokens(currentChunk)

      if (currentTokens + segmentTokens > config.maxChunkSize && currentChunk.length > 0) {
        pushSegmentChunk(chunks, currentChunk, metadata, currentStart, charPosition, config.minChunkSize)

        const next = startNextSegmentWithOverlap(currentChunk, segment, config, charPosition)
        currentChunk = next.nextChunk
        currentStart = next.nextStart
      } else if (currentChunk.length > 0) {
        currentChunk += '\n\n' + segment
      } else {
        currentChunk = segment
      }

      charPosition += segment.length + 2
    }

    finalizeRemainingChunk(
      chunks,
      currentChunk,
      metadata,
      currentStart,
      content.length,
      config.minChunkSize
    )
    assignTotalChunkCounts(chunks)

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
