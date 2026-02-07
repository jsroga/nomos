/**
 * Voyage AI Embedding Service
 *
 * Production-grade embedding service using Voyage AI's voyage-3 model.
 * Features:
 * - Batch embedding with rate limiting
 * - Separate query vs document embeddings (critical for RAG)
 * - Exponential backoff for retries
 * - Caching for repeated queries
 *
 * NOTE: Pure implementation - no LangChain dependency
 */

/**
 * Embeddings interface (LangChain-free)
 * Provides the standard embedding methods without external dependencies
 */
export interface IEmbeddings {
  embedDocuments(texts: string[]): Promise<number[][]>
  embedQuery(text: string): Promise<number[]>
}

// Voyage AI configuration
const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const VOYAGE_MODEL = 'voyage-3' // Best for RAG, 1024 dimensions
const VOYAGE_LITE_MODEL = 'voyage-3-lite' // Faster, 512 dimensions
const MAX_BATCH_SIZE = 128 // Voyage supports up to 128 texts per request
const MAX_TOKENS_PER_TEXT = 16000 // voyage-3 supports 16K tokens
const RATE_LIMIT_RPM = 300 // Requests per minute for paid tier
const EMBEDDING_DIMENSIONS = 1024 // voyage-3 output dimensions

export interface VoyageEmbeddingConfig {
  model?: 'voyage-3' | 'voyage-3-lite' | 'voyage-code-3'
  inputType?: 'document' | 'query'
  truncation?: boolean
  outputDimension?: number
}

interface VoyageAPIResponse {
  object: string
  data: Array<{
    object: string
    embedding: number[]
    index: number
  }>
  model: string
  usage: {
    total_tokens: number
  }
}

interface CacheEntry {
  embedding: number[]
  timestamp: number
}

// Simple in-memory cache for embeddings
const embeddingCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

// Rate limiter state
let requestCount = 0
let windowStart = Date.now()

function getCacheKey(text: string, inputType: string, model: string): string {
  if (!text) return `${model}:${inputType}:empty`
  return `${model}:${inputType}:${text.slice(0, 100)}`
}

function checkCache(key: string): number[] | null {
  const entry = embeddingCache.get(key)
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.embedding
  }
  embeddingCache.delete(key)
  return null
}

function setCache(key: string, embedding: number[]): void {
  // Limit cache size
  if (embeddingCache.size > 10000) {
    const oldestKey = embeddingCache.keys().next().value
    if (oldestKey) embeddingCache.delete(oldestKey)
  }
  embeddingCache.set(key, { embedding, timestamp: Date.now() })
}

async function waitForRateLimit(): Promise<void> {
  const now = Date.now()
  if (now - windowStart > 60000) {
    // Reset window
    windowStart = now
    requestCount = 0
  }

  if (requestCount >= RATE_LIMIT_RPM) {
    const waitTime = 60000 - (now - windowStart) + 100
    console.log(`[Voyage] Rate limit reached, waiting ${waitTime}ms`)
    await new Promise(resolve => setTimeout(resolve, waitTime))
    windowStart = Date.now()
    requestCount = 0
  }

  requestCount++
}

// Circuit Breaker state
let rateLimitUntil = 0

async function callVoyageAPI(
  texts: string[],
  config: VoyageEmbeddingConfig,
  retryCount = 0
): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY
  const isEnabled = process.env.VOYAGE_ENABLED !== 'false'

  // 1. Check Circuit Breaker & Config
  if (!isEnabled || !apiKey || Date.now() < rateLimitUntil) {
    if (Date.now() < rateLimitUntil) {
      console.warn(`[Voyage] Circuit breaker active. Skipping API call (cooldown expires in ${Math.ceil((rateLimitUntil - Date.now()) / 1000)}s).`)
    } else if (!isEnabled) {
      console.warn('[Voyage] Disabled via VOYAGE_ENABLED=false.')
    } else {
      console.warn('[Voyage] VOYAGE_API_KEY not set.')
    }

    // Return mock embeddings of correct dimension (1024)
    const mockEmbedding = new Array(EMBEDDING_DIMENSIONS).fill(0)
    return texts.map(() => [...mockEmbedding])
  }

  await waitForRateLimit()

  const model = config.model || VOYAGE_MODEL
  const inputType = config.inputType || 'document'

  try {
    const response = await fetch(VOYAGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: texts,
        input_type: inputType,
        truncation: config.truncation ?? true,
        ...(config.outputDimension && { output_dimension: config.outputDimension }),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()

      // Handle rate limiting
      if (response.status === 429) {
        // Stop retrying if we've hit the limit too many times
        if (retryCount >= 3) {
          console.error('[Voyage] Rate limit exceeded max retries. Activating circuit breaker for 60s.')
          rateLimitUntil = Date.now() + 60000 // 1 minute cooldown
          const mockEmbedding = new Array(EMBEDDING_DIMENSIONS).fill(0)
          return texts.map(() => [...mockEmbedding])
        }

        const retryAfter = parseInt(response.headers.get('retry-after') || '5', 10)
        console.warn(`[Voyage] Rate limited, retrying after ${retryAfter}s (attempt ${retryCount + 1}/3)`)
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
        return callVoyageAPI(texts, config, retryCount + 1)
      }

      // Handle server errors with exponential backoff
      if (response.status >= 500 && retryCount < 3) {
        const backoff = Math.pow(2, retryCount) * 1000
        console.warn(`[Voyage] Server error, retrying in ${backoff}ms`)
        await new Promise(resolve => setTimeout(resolve, backoff))
        return callVoyageAPI(texts, config, retryCount + 1)
      }

      throw new Error(`Voyage API error (${response.status}): ${errorText}`)
    }

    const data: VoyageAPIResponse = await response.json()

    // Sort by index to ensure correct order
    const sorted = data.data.sort((a, b) => a.index - b.index)
    return sorted.map(item => item.embedding)
  } catch (error) {
    if (retryCount < 3 && error instanceof Error && error.message.includes('fetch')) {
      const backoff = Math.pow(2, retryCount) * 1000
      console.warn(`[Voyage] Network error, retrying in ${backoff}ms`)
      await new Promise(resolve => setTimeout(resolve, backoff))
      return callVoyageAPI(texts, config, retryCount + 1)
    }
    throw error
  }
}

/**
 * VoyageEmbeddings class implementing the IEmbeddings interface
 * Pure implementation without LangChain dependency
 */
export class VoyageEmbeddings implements IEmbeddings {
  private model: string
  private truncation: boolean

  constructor(config?: Partial<VoyageEmbeddingConfig>) {
    this.model = config?.model || VOYAGE_MODEL
    this.truncation = config?.truncation ?? true
  }

  /**
   * Embed documents (uses 'document' input_type for better indexing)
   */
  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []

    const results: number[][] = []
    const uncachedTexts: string[] = []
    const uncachedIndices: number[] = []

    // Check cache first
    for (let i = 0; i < texts.length; i++) {
      const cacheKey = getCacheKey(texts[i], 'document', this.model)
      const cached = checkCache(cacheKey)
      if (cached) {
        results[i] = cached
      } else {
        uncachedTexts.push(texts[i])
        uncachedIndices.push(i)
      }
    }

    // Batch uncached texts
    if (uncachedTexts.length > 0) {
      const batches: string[][] = []
      for (let i = 0; i < uncachedTexts.length; i += MAX_BATCH_SIZE) {
        batches.push(uncachedTexts.slice(i, i + MAX_BATCH_SIZE))
      }

      let embeddingIndex = 0
      for (const batch of batches) {
        const embeddings = await callVoyageAPI(batch, {
          model: this.model as VoyageEmbeddingConfig['model'],
          inputType: 'document',
          truncation: this.truncation,
        })

        for (let i = 0; i < embeddings.length; i++) {
          const originalIndex = uncachedIndices[embeddingIndex]
          results[originalIndex] = embeddings[i]

          // Cache the result
          const cacheKey = getCacheKey(batch[i], 'document', this.model)
          setCache(cacheKey, embeddings[i])

          embeddingIndex++
        }
      }
    }

    return results
  }

  /**
   * Embed a single query (uses 'query' input_type for better retrieval)
   */
  async embedQuery(text: string): Promise<number[]> {
    const cacheKey = getCacheKey(text, 'query', this.model)
    const cached = checkCache(cacheKey)
    if (cached) return cached

    const embeddings = await callVoyageAPI([text], {
      model: this.model as VoyageEmbeddingConfig['model'],
      inputType: 'query',
      truncation: this.truncation,
    })

    const embedding = embeddings[0]
    setCache(cacheKey, embedding)

    return embedding
  }

  /**
   * Embed multiple queries in a single batch (uses 'query' input_type)
   * More efficient than calling embedQuery multiple times
   */
  async embedQueries(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []

    const results: number[][] = []
    const uncachedTexts: string[] = []
    const uncachedIndices: number[] = []

    // Check cache first
    for (let i = 0; i < texts.length; i++) {
      const cacheKey = getCacheKey(texts[i], 'query', this.model)
      const cached = checkCache(cacheKey)
      if (cached) {
        results[i] = cached
      } else {
        uncachedTexts.push(texts[i])
        uncachedIndices.push(i)
      }
    }

    // Batch uncached texts
    if (uncachedTexts.length > 0) {
      const batches: string[][] = []
      for (let i = 0; i < uncachedTexts.length; i += MAX_BATCH_SIZE) {
        batches.push(uncachedTexts.slice(i, i + MAX_BATCH_SIZE))
      }

      let embeddingIndex = 0
      for (const batch of batches) {
        const embeddings = await callVoyageAPI(batch, {
          model: this.model as VoyageEmbeddingConfig['model'],
          inputType: 'query',
          truncation: this.truncation,
        })

        for (let i = 0; i < embeddings.length; i++) {
          const originalIndex = uncachedIndices[embeddingIndex]
          results[originalIndex] = embeddings[i]

          // Cache the result
          const cacheKey = getCacheKey(batch[i], 'query', this.model)
          setCache(cacheKey, embeddings[i])

          embeddingIndex++
        }
      }
    }

    return results
  }
}

/**
 * Singleton instance for the embedding service
 */
let voyageInstance: VoyageEmbeddings | null = null

export function getVoyageEmbeddings(config?: Partial<VoyageEmbeddingConfig>): VoyageEmbeddings {
  if (!voyageInstance) {
    voyageInstance = new VoyageEmbeddings(config)
  }
  return voyageInstance
}

/**
 * Utility function to clear the embedding cache
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear()
}

/**
 * Get embedding dimensions for the current model
 */
export function getEmbeddingDimensions(): number {
  return EMBEDDING_DIMENSIONS
}

export { EMBEDDING_DIMENSIONS, VOYAGE_MODEL, VOYAGE_LITE_MODEL }
