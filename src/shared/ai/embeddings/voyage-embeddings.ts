import {
  VOYAGE_CACHE_MAX_SIZE,
  VOYAGE_CACHE_TTL_MS,
  VOYAGE_DEFAULT_MODEL,
  VOYAGE_MAX_BATCH_SIZE,
  VOYAGE_MODEL_VALUES,
  VOYAGE_RATE_LIMIT_RPM,
  VOYAGE_RATE_LIMIT_WINDOW_MS,
  VoyageInputType,
} from '@/shared/ai/constants/voyage-embeddings'
import { callVoyageAPI, type VoyageEmbeddingConfig, type VoyageModelId } from './voyage-api-client'

export interface IEmbeddings {
  embedDocuments(texts: string[]): Promise<number[][]>
  embedQuery(text: string): Promise<number[]>
}

export type { VoyageEmbeddingConfig, VoyageModelId }

interface CacheEntry {
  embedding: number[]
  timestamp: number
}

const embeddingCache = new Map<string, CacheEntry>()

let requestCount = 0
let windowStart = Date.now()

function parseVoyageModel(value: unknown): VoyageModelId {
  const raw = typeof value === 'string' ? value : process.env.EMBEDDING_MODEL
  if (!raw) return VOYAGE_DEFAULT_MODEL
  const normalized = raw.includes(':') && !raw.includes('/') ? raw.replace(':', '/') : raw
  for (const model of VOYAGE_MODEL_VALUES) {
    if (model === normalized) return model
  }
  return VOYAGE_DEFAULT_MODEL
}

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
  if (embeddingCache.size > VOYAGE_CACHE_MAX_SIZE) {
    const oldestKey = embeddingCache.keys().next().value
    if (oldestKey) embeddingCache.delete(oldestKey)
  }
  embeddingCache.set(key, { embedding, timestamp: Date.now() })
}

async function waitForRateLimit(): Promise<void> {
  const now = Date.now()
  if (now - windowStart > VOYAGE_RATE_LIMIT_WINDOW_MS) {
    windowStart = now
    requestCount = 0
  }

  if (requestCount >= VOYAGE_RATE_LIMIT_RPM) {
    const waitTime = VOYAGE_RATE_LIMIT_WINDOW_MS - (now - windowStart) + 100
    console.log(`[Embeddings] Rate limit reached, waiting ${waitTime}ms`)
    await new Promise(resolve => setTimeout(resolve, waitTime))
    windowStart = Date.now()
    requestCount = 0
  }

  requestCount++
}

function invokeVoyageAPI(texts: string[], config: VoyageEmbeddingConfig): Promise<number[][]> {
  return callVoyageAPI(texts, config, 0, waitForRateLimit)
}

async function embedWithCache(
  texts: string[],
  inputType: VoyageInputType,
  model: VoyageModelId,
  truncation: boolean
): Promise<number[][]> {
  if (texts.length === 0) return []

  const results: number[][] = []
  const uncachedTexts: string[] = []
  const uncachedIndices: number[] = []

  for (let i = 0; i < texts.length; i++) {
    const cacheKey = getCacheKey(texts[i], inputType, model)
    const cached = checkCache(cacheKey)
    if (cached) {
      results[i] = cached
    } else {
      uncachedTexts.push(texts[i])
      uncachedIndices.push(i)
    }
  }

  if (uncachedTexts.length > 0) {
    const batches: string[][] = []
    for (let i = 0; i < uncachedTexts.length; i += VOYAGE_MAX_BATCH_SIZE) {
      batches.push(uncachedTexts.slice(i, i + VOYAGE_MAX_BATCH_SIZE))
    }

    let embeddingIndex = 0
    for (const batch of batches) {
      const embeddings = await invokeVoyageAPI(batch, {
        model,
        inputType,
        truncation,
      })

      for (let i = 0; i < embeddings.length; i++) {
        const originalIndex = uncachedIndices[embeddingIndex]
        results[originalIndex] = embeddings[i]
        const cacheKey = getCacheKey(batch[i], inputType, model)
        setCache(cacheKey, embeddings[i])
        embeddingIndex++
      }
    }
  }

  return results
}

export class VoyageEmbeddings implements IEmbeddings {
  private model: VoyageModelId
  private truncation: boolean

  constructor(config?: Partial<VoyageEmbeddingConfig>) {
    this.model = parseVoyageModel(config?.model)
    this.truncation = config?.truncation ?? true
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return embedWithCache(texts, VoyageInputType.Document, this.model, this.truncation)
  }

  async embedQuery(text: string): Promise<number[]> {
    const cacheKey = getCacheKey(text, VoyageInputType.Query, this.model)
    const cached = checkCache(cacheKey)
    if (cached) return cached

    const embeddings = await invokeVoyageAPI([text], {
      model: this.model,
      inputType: VoyageInputType.Query,
      truncation: this.truncation,
    })

    const embedding = embeddings[0]
    setCache(cacheKey, embedding)
    return embedding
  }

  async embedQueries(texts: string[]): Promise<number[][]> {
    return embedWithCache(texts, VoyageInputType.Query, this.model, this.truncation)
  }
}

let voyageInstance: VoyageEmbeddings | null = null

export function getVoyageEmbeddings(config?: Partial<VoyageEmbeddingConfig>): VoyageEmbeddings {
  if (!voyageInstance) {
    voyageInstance = new VoyageEmbeddings(config)
  }
  return voyageInstance
}

export { VOYAGE_EMBEDDING_DIMENSIONS as EMBEDDING_DIMENSIONS, VOYAGE_DEFAULT_MODEL as VOYAGE_MODEL } from '@/shared/ai/constants/voyage-embeddings'
