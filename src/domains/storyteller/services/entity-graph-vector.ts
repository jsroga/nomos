import { sql } from 'drizzle-orm'
import { VectorStringError } from '@/domains/storyteller/services/constants/entity-graph-wire'

export const EMBEDDING_DIMENSION = 1536
export const HOP_DECAY_FACTOR = 0.7
export const MIN_RELEVANCE_THRESHOLD = 0.3

export function toVectorString(embedding: unknown): string {
  if (embedding === null || embedding === undefined) {
    throw new Error('toVectorString: embedding is null/undefined')
  }

  if (typeof embedding === 'string') {
    if (!embedding.startsWith('[') || !embedding.endsWith(']')) {
      throw new Error(VectorStringError.InvalidStringFormat)
    }
    return embedding
  }

  if (!Array.isArray(embedding)) {
    throw new Error(VectorStringError.ExpectedArray)
  }

  if (embedding.length === 0) {
    throw new Error(VectorStringError.EmptyEmbedding)
  }

  for (let i = 0; i < embedding.length; i++) {
    const val = embedding[i]
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      throw new Error(`toVectorString: non-numeric value at index ${i}: ${typeof val}`)
    }
  }

  if (embedding.length !== EMBEDDING_DIMENSION) {
    console.warn(
      `[EntityGraph] Embedding dimension mismatch: got ${embedding.length}, expected ${EMBEDDING_DIMENSION}`
    )
  }

  return `'[${embedding.join(',')}]'`
}

export function vectorSql(embedding: unknown) {
  const vecStr = toVectorString(embedding)
  return sql.raw(`${vecStr}::vector`)
}
