import { sql } from 'drizzle-orm'
import { VectorStringError } from '@/domains/storyteller/services/constants/entity-graph-wire'

/** Fallback when the live column dim cannot be probed (matches API output dim). */
export const EMBEDDING_DIMENSION = 1536
export const HOP_DECAY_FACTOR = 0.7
export const MIN_RELEVANCE_THRESHOLD = 0.3

/** Truncate (Matryoshka-safe) or zero-pad to the pgvector column dimension. */
export function fitEmbeddingDimensions(embedding: number[], targetDim: number): number[] {
  if (embedding.length === targetDim) return embedding
  if (embedding.length > targetDim) return embedding.slice(0, targetDim)
  const padded = embedding.slice()
  while (padded.length < targetDim) padded.push(0)
  return padded
}

/** Short, cause-first message for logs — avoids dumping full drizzle query params. */
export function conciseErrorMessage(error: unknown): string {
  let deepest: unknown = error
  for (let i = 0; i < 5; i += 1) {
    if (deepest instanceof Error && deepest.cause !== undefined && deepest.cause !== null) {
      deepest = deepest.cause
      continue
    }
    break
  }
  const message = deepest instanceof Error ? deepest.message : String(deepest)
  const MAX = 300
  return message.length > MAX ? `${message.slice(0, MAX)}…` : message
}

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

  return `'[${embedding.join(',')}]'`
}

export function vectorSql(embedding: unknown) {
  const vecStr = toVectorString(embedding)
  return sql.raw(`${vecStr}::vector`)
}
