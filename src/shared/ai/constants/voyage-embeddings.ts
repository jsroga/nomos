/** RAG embedding wire values — OpenRouter `/embeddings` (same OPENROUTER_API_KEY as LLMs). */

export const VOYAGE_API_URL = 'https://openrouter.ai/api/v1/embeddings'
export const VOYAGE_DEFAULT_MODEL = 'openai/text-embedding-3-small'
export const VOYAGE_MAX_BATCH_SIZE = 128
export const VOYAGE_RATE_LIMIT_RPM = 300
/** Matches `document_embeddings.embedding` / OpenAI text-embedding-3-small. */
export const VOYAGE_EMBEDDING_DIMENSIONS = 1536
export const VOYAGE_CACHE_TTL_MS = 30 * 60 * 1000
export const VOYAGE_CACHE_MAX_SIZE = 10000
export const VOYAGE_RATE_LIMIT_WINDOW_MS = 60000
export const VOYAGE_CIRCUIT_BREAKER_MS = 60000
export const VOYAGE_MAX_RETRIES = 3
export const VOYAGE_DEFAULT_RETRY_AFTER_SEC = 5

export const VOYAGE_MODEL_VALUES = [
  'openai/text-embedding-3-small',
  'openai/text-embedding-3-large',
  'voyageai/voyage-4-large',
] as const

export enum VoyageInputType {
  Document = 'document',
  Query = 'query',
}

export enum VoyageHttpHeader {
  RetryAfter = 'retry-after',
}

export const VOYAGE_LOG_DISABLED =
  '[Embeddings] Off — set FF_VOYAGE_EMBEDDINGS=true to enable.'
export const VOYAGE_LOG_API_KEY_MISSING =
  '[Embeddings] OPENROUTER_API_KEY not set.'
export const VOYAGE_LOG_RATE_LIMIT_CIRCUIT =
  '[Embeddings] Rate limit exceeded max retries. Activating circuit breaker for 60s.'

export const VOYAGE_NETWORK_ERROR_TOKEN = 'fetch'
