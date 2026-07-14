import {
  VOYAGE_API_URL,
  VOYAGE_CACHE_MAX_SIZE,
  VOYAGE_CACHE_TTL_MS,
  VOYAGE_CIRCUIT_BREAKER_MS,
  VOYAGE_DEFAULT_MODEL,
  VOYAGE_DEFAULT_RETRY_AFTER_SEC,
  VOYAGE_EMBEDDING_DIMENSIONS,
  VOYAGE_LOG_API_KEY_MISSING,
  VOYAGE_LOG_DISABLED,
  VOYAGE_LOG_RATE_LIMIT_CIRCUIT,
  VOYAGE_MAX_BATCH_SIZE,
  VOYAGE_MAX_RETRIES,
  VOYAGE_MODEL_VALUES,
  VOYAGE_NETWORK_ERROR_TOKEN,
  VOYAGE_RATE_LIMIT_RPM,
  VOYAGE_RATE_LIMIT_WINDOW_MS,
  VoyageEnvFlag,
  VoyageHttpHeader,
  VoyageInputType,
} from '@/shared/ai/constants/voyage-embeddings'
import { ContentType, HttpAuthScheme, HttpMethod } from '@/shared/data/constants/protocol'

export interface IEmbeddings {
  embedDocuments(texts: string[]): Promise<number[][]>
  embedQuery(text: string): Promise<number[]>
}

export type VoyageModelId = (typeof VOYAGE_MODEL_VALUES)[number]

export interface VoyageEmbeddingConfig {
  model?: VoyageModelId
  inputType?: VoyageInputType
  truncation?: boolean
  outputDimension?: number
}

function parseVoyageModel(value: unknown): VoyageModelId {
  const raw = typeof value === 'string' ? value : null
  if (!raw) return VOYAGE_DEFAULT_MODEL
  for (const model of VOYAGE_MODEL_VALUES) {
    if (model === raw) return model
  }
  return VOYAGE_DEFAULT_MODEL
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

let requestCount = 0
let windowStart = Date.now()

function getCacheKey(text: string, inputType: string, model: string): string {
  if (!text) return `${model}:${inputType}:empty`
  return `${model}:${inputType}:${text.slice(0, 100)}`
}

function checkCache(key: string): number[] | null {
  const entry = embeddingCache.get(key)
  if (entry && Date.now() - entry.timestamp < VOYAGE_CACHE_TTL_MS) {
    return entry.embedding
  }
  embeddingCache.delete(key)
  return null
}

function setCache(key: string, embedding: number[]): void {
  // Limit cache size
  if (embeddingCache.size > VOYAGE_CACHE_MAX_SIZE) {
    const oldestKey = embeddingCache.keys().next().value
    if (oldestKey) embeddingCache.delete(oldestKey)
  }
  embeddingCache.set(key, { embedding, timestamp: Date.now() })
}

async function waitForRateLimit(): Promise<void> {
  const now = Date.now()
  if (now - windowStart > VOYAGE_RATE_LIMIT_WINDOW_MS) {
    // Reset window
    windowStart = now
    requestCount = 0
  }

  if (requestCount >= VOYAGE_RATE_LIMIT_RPM) {
    const waitTime = VOYAGE_RATE_LIMIT_WINDOW_MS - (now - windowStart) + 100
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
  const isEnabled = process.env.VOYAGE_ENABLED !== VoyageEnvFlag.Disabled

  // 1. Check Circuit Breaker & Config
  if (!isEnabled || !apiKey || Date.now() < rateLimitUntil) {
    if (Date.now() < rateLimitUntil) {
      console.warn(
        `[Voyage] Circuit breaker active. Skipping API call (cooldown expires in ${Math.ceil((rateLimitUntil - Date.now()) / 1000)}s).`
      )
    } else if (!isEnabled) {
      console.warn(VOYAGE_LOG_DISABLED)
    } else {
      console.warn(VOYAGE_LOG_API_KEY_MISSING)
    }

    const mockEmbedding = new Array(VOYAGE_EMBEDDING_DIMENSIONS).fill(0)
    return texts.map(() => [...mockEmbedding])
  }

  await waitForRateLimit()

  const model = config.model || VOYAGE_DEFAULT_MODEL
  const inputType = config.inputType || VoyageInputType.Document

  try {
    const response = await fetch(VOYAGE_API_URL, {
      method: HttpMethod.Post,
      headers: {
        'Content-Type': ContentType.Json,
        Authorization: `${HttpAuthScheme.Bearer}${apiKey}`,
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
        if (retryCount >= VOYAGE_MAX_RETRIES) {
          console.error(VOYAGE_LOG_RATE_LIMIT_CIRCUIT)
          rateLimitUntil = Date.now() + VOYAGE_CIRCUIT_BREAKER_MS
          const mockEmbedding = new Array(VOYAGE_EMBEDDING_DIMENSIONS).fill(0)
          return texts.map(() => [...mockEmbedding])
        }

        const retryAfter = parseInt(
          response.headers.get(VoyageHttpHeader.RetryAfter) || String(VOYAGE_DEFAULT_RETRY_AFTER_SEC),
          10
        )
        console.warn(
          `[Voyage] Rate limited, retrying after ${retryAfter}s (attempt ${retryCount + 1}/3)`
        )
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
        return callVoyageAPI(texts, config, retryCount + 1)
      }

      // Handle server errors with exponential backoff
      if (response.status >= 500 && retryCount < VOYAGE_MAX_RETRIES) {
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
    if (retryCount < VOYAGE_MAX_RETRIES && error instanceof Error && error.message.includes(VOYAGE_NETWORK_ERROR_TOKEN)) {
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
  private model: VoyageModelId
  private truncation: boolean

  constructor(config?: Partial<VoyageEmbeddingConfig>) {
    this.model = parseVoyageModel(config?.model)
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
      const cacheKey = getCacheKey(texts[i], VoyageInputType.Document, this.model)
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
      for (let i = 0; i < uncachedTexts.length; i += VOYAGE_MAX_BATCH_SIZE) {
        batches.push(uncachedTexts.slice(i, i + VOYAGE_MAX_BATCH_SIZE))
      }

      let embeddingIndex = 0
      for (const batch of batches) {
        const embeddings = await callVoyageAPI(batch, {
          model: this.model,
          inputType: VoyageInputType.Document,
          truncation: this.truncation,
        })

        for (let i = 0; i < embeddings.length; i++) {
          const originalIndex = uncachedIndices[embeddingIndex]
          results[originalIndex] = embeddings[i]

          // Cache the result
          const cacheKey = getCacheKey(batch[i], VoyageInputType.Document, this.model)
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
    const cacheKey = getCacheKey(text, VoyageInputType.Query, this.model)
    const cached = checkCache(cacheKey)
    if (cached) return cached

    const embeddings = await callVoyageAPI([text], {
          model: this.model,
      inputType: VoyageInputType.Query,
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
      const cacheKey = getCacheKey(texts[i], VoyageInputType.Query, this.model)
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
      for (let i = 0; i < uncachedTexts.length; i += VOYAGE_MAX_BATCH_SIZE) {
        batches.push(uncachedTexts.slice(i, i + VOYAGE_MAX_BATCH_SIZE))
      }

      let embeddingIndex = 0
      for (const batch of batches) {
        const embeddings = await callVoyageAPI(batch, {
          model: this.model,
          inputType: VoyageInputType.Query,
          truncation: this.truncation,
        })

        for (let i = 0; i < embeddings.length; i++) {
          const originalIndex = uncachedIndices[embeddingIndex]
          results[originalIndex] = embeddings[i]

          // Cache the result
          const cacheKey = getCacheKey(batch[i], VoyageInputType.Query, this.model)
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

export { VOYAGE_EMBEDDING_DIMENSIONS as EMBEDDING_DIMENSIONS, VOYAGE_DEFAULT_MODEL as VOYAGE_MODEL }
