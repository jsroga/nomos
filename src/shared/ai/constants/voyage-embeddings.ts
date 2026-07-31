/** Voyage AI embedding API wire values and log messages. */

export const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
export const VOYAGE_DEFAULT_MODEL = 'voyage-3'
export const VOYAGE_MAX_BATCH_SIZE = 128
export const VOYAGE_RATE_LIMIT_RPM = 300
export const VOYAGE_EMBEDDING_DIMENSIONS = 1024
export const VOYAGE_CACHE_TTL_MS = 30 * 60 * 1000
export const VOYAGE_CACHE_MAX_SIZE = 10000
export const VOYAGE_RATE_LIMIT_WINDOW_MS = 60000
export const VOYAGE_CIRCUIT_BREAKER_MS = 60000
export const VOYAGE_MAX_RETRIES = 3
export const VOYAGE_DEFAULT_RETRY_AFTER_SEC = 5

export const VOYAGE_MODEL_VALUES = ['voyage-3', 'voyage-3-lite', 'voyage-code-3'] as const

export enum VoyageInputType {
  Document = 'document',
  Query = 'query',
}

export enum VoyageHttpHeader {
  RetryAfter = 'retry-after',
}

export const VOYAGE_LOG_DISABLED =
  '[Voyage] Embeddings off — set FF_VOYAGE_EMBEDDINGS=true to enable.'
export const VOYAGE_LOG_API_KEY_MISSING = '[Voyage] VOYAGE_API_KEY not set.'
export const VOYAGE_LOG_RATE_LIMIT_CIRCUIT =
  '[Voyage] Rate limit exceeded max retries. Activating circuit breaker for 60s.'

export const VOYAGE_NETWORK_ERROR_TOKEN = 'fetch'
