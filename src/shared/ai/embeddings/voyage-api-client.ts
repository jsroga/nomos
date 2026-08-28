import { env } from '@/shared/config/env'
import {
  VOYAGE_API_URL,
  VOYAGE_CIRCUIT_BREAKER_MS,
  VOYAGE_DEFAULT_MODEL,
  VOYAGE_DEFAULT_RETRY_AFTER_SEC,
  VOYAGE_EMBEDDING_DIMENSIONS,
  VOYAGE_LOG_API_KEY_MISSING,
  VOYAGE_LOG_DISABLED,
  VOYAGE_LOG_RATE_LIMIT_CIRCUIT,
  VOYAGE_MAX_RETRIES,
  VOYAGE_MODEL_VALUES,
  VoyageHttpHeader,
  VoyageInputType,
  VOYAGE_NETWORK_ERROR_TOKEN,
} from '@/shared/ai/constants/voyage-embeddings'
import { ContentType, HttpAuthScheme, HttpMethod } from '@/shared/data/constants/protocol'
import { FeatureFlag, isFeatureEnabled } from '@/shared/data/constants/feature-flags'

export type VoyageModelId = (typeof VOYAGE_MODEL_VALUES)[number]

export interface VoyageEmbeddingConfig {
  model?: VoyageModelId
  inputType?: VoyageInputType
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

let rateLimitUntil = 0

export function createMockEmbeddings(count: number): number[][] {
  const mockEmbedding = new Array(VOYAGE_EMBEDDING_DIMENSIONS).fill(0)
  return Array.from({ length: count }, () => [...mockEmbedding])
}

function logSkipReason(apiKey: string | undefined, isEnabled: boolean): void {
  if (Date.now() < rateLimitUntil) {
    console.warn(
      `[Embeddings] Circuit breaker active. Skipping API call (cooldown expires in ${Math.ceil((rateLimitUntil - Date.now()) / 1000)}s).`
    )
    return
  }
  if (!isEnabled) {
    console.warn(VOYAGE_LOG_DISABLED)
    return
  }
  if (!apiKey) {
    console.warn(VOYAGE_LOG_API_KEY_MISSING)
  }
}

function shouldSkipVoyageCall(apiKey: string | undefined, isEnabled: boolean): boolean {
  if (Date.now() < rateLimitUntil || !isEnabled || !apiKey) {
    logSkipReason(apiKey, isEnabled)
    return true
  }
  return false
}

async function retryAfterDelay(
  texts: string[],
  config: VoyageEmbeddingConfig,
  retryCount: number,
  delayMs: number,
  waitForRateLimit: () => Promise<void>
): Promise<number[][]> {
  await new Promise(resolve => setTimeout(resolve, delayMs))
  return callVoyageAPI(texts, config, retryCount + 1, waitForRateLimit)
}

async function handleRateLimitResponse(
  texts: string[],
  config: VoyageEmbeddingConfig,
  retryCount: number,
  retryAfterSec: number,
  waitForRateLimit: () => Promise<void>
): Promise<number[][]> {
  if (retryCount >= VOYAGE_MAX_RETRIES) {
    console.error(VOYAGE_LOG_RATE_LIMIT_CIRCUIT)
    rateLimitUntil = Date.now() + VOYAGE_CIRCUIT_BREAKER_MS
    return createMockEmbeddings(texts.length)
  }

  console.warn(
    `[Embeddings] Rate limited, retrying after ${retryAfterSec}s (attempt ${retryCount + 1}/3)`
  )
  return retryAfterDelay(texts, config, retryCount, retryAfterSec * 1000, waitForRateLimit)
}

function resolveEmbeddingModel(model: string | undefined): string {
  const raw = (model || env.EMBEDDING_MODEL || VOYAGE_DEFAULT_MODEL).trim()
  return raw.includes(':') && !raw.includes('/') ? raw.replace(':', '/') : raw
}

export async function callVoyageAPI(
  texts: string[],
  config: VoyageEmbeddingConfig,
  retryCount: number,
  waitForRateLimit: () => Promise<void>
): Promise<number[][]> {
  const apiKey = env.OPENROUTER_API_KEY
  const isEnabled = isFeatureEnabled(FeatureFlag.VoyageEmbeddings)

  if (shouldSkipVoyageCall(apiKey, isEnabled)) {
    return createMockEmbeddings(texts.length)
  }

  await waitForRateLimit()

  const model = resolveEmbeddingModel(config.model)
  const dimensions = config.outputDimension ?? VOYAGE_EMBEDDING_DIMENSIONS

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
        dimensions,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()

      if (response.status === 429) {
        const retryAfter = parseInt(
          response.headers.get(VoyageHttpHeader.RetryAfter) || String(VOYAGE_DEFAULT_RETRY_AFTER_SEC),
          10
        )
        return handleRateLimitResponse(texts, config, retryCount, retryAfter, waitForRateLimit)
      }

      if (response.status >= 500 && retryCount < VOYAGE_MAX_RETRIES) {
        const backoff = Math.pow(2, retryCount) * 1000
        console.warn(`[Embeddings] Server error, retrying in ${backoff}ms`)
        return retryAfterDelay(texts, config, retryCount, backoff, waitForRateLimit)
      }

      throw new Error(`OpenRouter embeddings error (${response.status}): ${errorText}`)
    }

    const data: VoyageAPIResponse = await response.json()
    const sorted = data.data.sort((a, b) => a.index - b.index)
    return sorted.map(item => item.embedding)
  } catch (error) {
    if (
      retryCount < VOYAGE_MAX_RETRIES &&
      error instanceof Error &&
      error.message.includes(VOYAGE_NETWORK_ERROR_TOKEN)
    ) {
      const backoff = Math.pow(2, retryCount) * 1000
      console.warn(`[Embeddings] Network error, retrying in ${backoff}ms`)
      return retryAfterDelay(texts, config, retryCount, backoff, waitForRateLimit)
    }
    throw error
  }
}
