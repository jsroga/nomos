import { v4 as uuidv4 } from 'uuid'
import type { ChunkConfig, DocumentChunk } from './semantic-chunker'

const CHARS_PER_TOKEN = 4

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

function extractHeadings(text: string): string[] {
  const headings: string[] = []
  const mdHeadings = text.match(/^#{1,6}\s+(.+)$/gm)
  if (mdHeadings) {
    headings.push(...mdHeadings.map(h => h.replace(/^#+\s+/, '').trim()))
  }
  const boldHeadings = text.match(/^\*\*(.+?)\*\*/gm)
  if (boldHeadings) {
    headings.push(...boldHeadings.map(h => h.replace(/\*\*/g, '').trim()))
  }
  return [...new Set(headings)]
}

function extractEntities(text: string): string[] {
  const entities: string[] = []
  const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g
  const matches = text.match(capitalizedPattern)

  if (matches) {
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

  return entities.slice(0, 20)
}

interface ChunkMetadataInput {
  documentId: string
  projectId: string
  documentType: string
}

export function createSingleChunk(
  content: string,
  metadata: ChunkMetadataInput
): DocumentChunk[] {
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

export function pushSegmentChunk(
  chunks: DocumentChunk[],
  currentChunk: string,
  metadata: ChunkMetadataInput,
  currentStart: number,
  charEnd: number,
  minChunkSize: number
): void {
  const currentTokens = estimateTokens(currentChunk)
  if (currentTokens >= minChunkSize || chunks.length === 0) {
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
        charEnd,
        timestamp: new Date(),
      },
    })
  }
}

export function startNextSegmentWithOverlap(
  currentChunk: string,
  segment: string,
  config: ChunkConfig,
  charPosition: number
): { nextChunk: string; nextStart: number } {
  if (config.overlapSize > 0) {
    const overlapChars = config.overlapSize * CHARS_PER_TOKEN
    return {
      nextChunk: currentChunk.slice(-overlapChars) + '\n\n' + segment,
      nextStart: charPosition - overlapChars,
    }
  }
  return { nextChunk: segment, nextStart: charPosition }
}

export function finalizeRemainingChunk(
  chunks: DocumentChunk[],
  currentChunk: string,
  metadata: ChunkMetadataInput,
  currentStart: number,
  contentLength: number,
  minChunkSize: number
): void {
  if (currentChunk.trim().length === 0) return

  const currentTokens = estimateTokens(currentChunk)
  if (currentTokens >= minChunkSize || chunks.length === 0) {
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
        charEnd: contentLength,
        timestamp: new Date(),
      },
    })
    return
  }

  if (chunks.length === 0) return

  const lastChunk = chunks[chunks.length - 1]
  lastChunk.content += '\n\n' + currentChunk.trim()
  lastChunk.metadata.charEnd = contentLength
  lastChunk.metadata.headings = [
    ...lastChunk.metadata.headings,
    ...extractHeadings(currentChunk),
  ]
  lastChunk.metadata.entities = [
    ...new Set([...lastChunk.metadata.entities, ...extractEntities(currentChunk)]),
  ]
}

export function assignTotalChunkCounts(chunks: DocumentChunk[]): void {
  for (const chunk of chunks) {
    chunk.metadata.totalChunks = chunks.length
  }
}

export { estimateTokens }
