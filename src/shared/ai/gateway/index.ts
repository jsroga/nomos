/**
 * The one module that calls a model, and the one that knows what it cost.
 *
 * Before this, not a single call site captured the `usage` object providers
 * return — everything called "tokens" was an estimate. For a product whose
 * unit economics *are* model spend, that was the largest missing instrument.
 *
 * Takes a `ProjectScope` rather than a project id, so [SPEC-06]'s guarantee
 * extends to spend: you cannot bill a project you have not proved you own.
 */
import { createOpenAI } from '@ai-sdk/openai'
import { generateObject, generateText } from 'ai'
import type { ZodType } from 'zod'
import type { ProjectScope } from '@/shared/auth/project-scope'
import { env } from '@/shared/config/env'
import {
  GATEWAY_MAX_ATTEMPTS,
  GATEWAY_RETRY_DELAY_MS,
  GATEWAY_SDK_RETRIES,
  GATEWAY_TIMEOUT_MS,
  LlmOutcome,
  PROVIDER_ERROR_MARKER,
  RETRYABLE_OUTCOMES,
  type LlmFeature,
} from '@/shared/ai/gateway/constants/llm-call'
import {
  OPENROUTER_BASE_URL,
  OPENROUTER_PROVIDER,
  VOYAGE_PROVIDER,
} from '@/shared/ai/gateway/constants/provider'
import { getVoyageEmbeddings } from '@/shared/ai/embeddings/voyage-embeddings'
import { recordLlmCall } from '@/shared/ai/gateway/record'

export interface GatewayRequest {
  scope: ProjectScope
  feature: LlmFeature
  model: string
  system?: string
  prompt: string
  traceId?: string
  temperature?: number
}

export interface GatewayResult {
  text: string
}

function client() {
  return createOpenAI({ apiKey: env.OPENROUTER_API_KEY, baseURL: OPENROUTER_BASE_URL })
}

/** Map a provider failure onto the outcome vocabulary the record uses. */
export function outcomeFor(error: unknown): LlmOutcome {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error)
  const has = (marker: string) => message.includes(marker)

  if (has(PROVIDER_ERROR_MARKER.Timeout) || has(PROVIDER_ERROR_MARKER.Aborted)) {
    return LlmOutcome.Timeout
  }
  if (has(PROVIDER_ERROR_MARKER.RateLimit) || has(PROVIDER_ERROR_MARKER.RateLimitStatus)) {
    return LlmOutcome.RateLimit
  }
  if (has(PROVIDER_ERROR_MARKER.Refusal)) return LlmOutcome.Refusal
  return LlmOutcome.Error
}

interface Usage {
  promptTokens: number
  completionTokens: number
}

function isRetryable(outcome: LlmOutcome): boolean {
  return RETRYABLE_OUTCOMES.some(candidate => candidate === outcome)
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Run one attempt, time it, and record it whatever happens.
 *
 * A retried call costs twice and the table has to say so, so each attempt
 * records separately rather than the caller recording once at the end. The
 * SDK's own retry is disabled for the same reason — it would hide the second
 * charge inside one result.
 */
async function meterOnce<T>(
  request: GatewayRequest,
  run: () => Promise<{ value: T; usage: Usage }>
): Promise<T> {
  const startedAt = Date.now()
  try {
    const { value, usage } = await run()
    await recordLlmCall({
      traceId: request.traceId,
      projectId: request.scope.projectId,
      userId: request.scope.userId,
      feature: request.feature,
      model: request.model,
      provider: OPENROUTER_PROVIDER,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      latencyMs: Date.now() - startedAt,
      outcome: LlmOutcome.Ok,
    })
    return value
  } catch (error) {
    await recordLlmCall({
      traceId: request.traceId,
      projectId: request.scope.projectId,
      userId: request.scope.userId,
      feature: request.feature,
      model: request.model,
      provider: OPENROUTER_PROVIDER,
      promptTokens: 0,
      completionTokens: 0,
      latencyMs: Date.now() - startedAt,
      outcome: outcomeFor(error),
    })
    throw error
  }
}

/** Retry the failures worth retrying, recording every attempt. */
async function meter<T>(
  request: GatewayRequest,
  run: () => Promise<{ value: T; usage: Usage }>
): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= GATEWAY_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await meterOnce(request, run)
    } catch (error) {
      lastError = error
      if (attempt === GATEWAY_MAX_ATTEMPTS || !isRetryable(outcomeFor(error))) throw error
      await wait(GATEWAY_RETRY_DELAY_MS)
    }
  }
  throw lastError
}

/** Free-text completion. */
export async function complete(request: GatewayRequest): Promise<GatewayResult> {
  return meter(request, async () => {
    const result = await generateText({
      model: client()(request.model),
      system: request.system,
      prompt: request.prompt,
      temperature: request.temperature,
      maxRetries: GATEWAY_SDK_RETRIES,
      abortSignal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
    })
    return {
      value: { text: result.text },
      usage: {
        promptTokens: result.usage?.inputTokens ?? 0,
        completionTokens: result.usage?.outputTokens ?? 0,
      },
    }
  })
}

/** Schema-constrained completion. A parse failure records `schema_fail`. */
export async function completeStructured<T>(
  request: GatewayRequest & { schema: ZodType<T> }
): Promise<T> {
  return meter(request, async () => {
    const result = await generateObject({
      model: client()(request.model),
      schema: request.schema,
      system: request.system,
      prompt: request.prompt,
      temperature: request.temperature,
      maxRetries: GATEWAY_SDK_RETRIES,
      abortSignal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
    })
    return {
      value: result.object,
      usage: {
        promptTokens: result.usage?.inputTokens ?? 0,
        completionTokens: result.usage?.outputTokens ?? 0,
      },
    }
  })
}

export interface EmbedRequest {
  scope: ProjectScope
  feature: LlmFeature
  texts: string[]
  traceId?: string
}

/**
 * Embeddings, metered.
 *
 * They are billed and were entirely invisible: Voyage reports
 * `usage.total_tokens` and the client discarded it. Recorded as prompt tokens,
 * since an embedding has no completion.
 */
export async function embed(request: EmbedRequest): Promise<number[][]> {
  const embeddings = getVoyageEmbeddings()
  const model = embeddings.modelId()
  const startedAt = Date.now()

  try {
    const { vectors, promptTokens } = await embeddings.embedDocumentsMetered(request.texts)
    await recordLlmCall({
      traceId: request.traceId,
      projectId: request.scope.projectId,
      userId: request.scope.userId,
      feature: request.feature,
      model,
      provider: VOYAGE_PROVIDER,
      promptTokens,
      completionTokens: 0,
      latencyMs: Date.now() - startedAt,
      outcome: LlmOutcome.Ok,
    })
    return vectors
  } catch (error) {
    await recordLlmCall({
      traceId: request.traceId,
      projectId: request.scope.projectId,
      userId: request.scope.userId,
      feature: request.feature,
      model,
      provider: VOYAGE_PROVIDER,
      promptTokens: 0,
      completionTokens: 0,
      latencyMs: Date.now() - startedAt,
      outcome: outcomeFor(error),
    })
    throw error
  }
}
