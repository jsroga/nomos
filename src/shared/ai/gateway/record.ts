/**
 * Writes one row per paid model call.
 *
 * **Recording never fails the call.** A metering outage must not take
 * generation down, so every write is fire-and-forget with its error caught and
 * counted. That trade is only defensible in this direction.
 */
import { llmCalls } from '@/db/schema'
import { db } from '@/shared/persistence/client'
import {
  GATEWAY_LOG,
  LLM_CALL_TABLE,
  type LlmFeature,
  type LlmOutcome,
} from '@/shared/ai/gateway/constants/llm-call'
import { PROVIDER_PRICING } from '@/shared/ai/gateway/constants/pricing'

enum LlmCostStatus {
  Priced = 'priced',
  Unknown = 'unknown',
}

export interface LlmCallRecord {
  traceId?: string
  projectId: string
  userId: string
  feature: LlmFeature
  model: string
  provider: string
  promptTokens: number
  completionTokens: number
  cachedTokens?: number
  latencyMs: number
  outcome: LlmOutcome
}

const TOKENS_PER_MILLION = 1_000_000

/** How many writes have failed. Read by `npm run spend` so silence is visible. */
let failedWrites = 0

/** Models seen with no price row. Warned about once each, not once per call. */
const unpricedModels = new Set<string>()

export function recordFailureCount(): number {
  return failedWrites
}

/** Models this process metered but could not cost. `npm run spend` names them. */
export function unpricedModelsSeen(): string[] {
  return [...unpricedModels]
}

/**
 * Cost in USD from the committed price table.
 *
 * @throws when the model has no price — a silent zero reads as "this was
 *   free", which is worse than no instrumentation at all.
 */
export function costUsdFor(model: string, promptTokens: number, completionTokens: number): number {
  const price = PROVIDER_PRICING[model]
  if (!price) throw new Error(`${GATEWAY_LOG.UnknownModel} ${model}`)

  const input = (promptTokens / TOKENS_PER_MILLION) * price.inputPerMillion
  const output = (completionTokens / TOKENS_PER_MILLION) * price.outputPerMillion
  return input + output
}

/**
 * Cost for a row, plus whether it came from PROVIDER_PRICING.
 * Unknown price keeps costUsd at 0 and marks cost_status unknown — never a silent free pass.
 */
function costForRecord(record: LlmCallRecord): { costUsd: number; costStatus: LlmCostStatus } {
  try {
    return {
      costUsd: costUsdFor(record.model, record.promptTokens, record.completionTokens),
      costStatus: LlmCostStatus.Priced,
    }
  } catch {
    if (!unpricedModels.has(record.model)) {
      unpricedModels.add(record.model)
      console.warn(`${GATEWAY_LOG.UnpricedRecorded} ${record.model}`)
    }
    return { costUsd: 0, costStatus: LlmCostStatus.Unknown }
  }
}

/** Fire-and-forget. Resolves even when the write fails. */
export async function recordLlmCall(record: LlmCallRecord): Promise<void> {
  try {
    const { costUsd, costStatus } = costForRecord(record)

    await db.insert(llmCalls).values({
      traceId: record.traceId,
      projectId: record.projectId,
      userId: record.userId,
      feature: record.feature,
      model: record.model,
      provider: record.provider,
      promptTokens: record.promptTokens,
      completionTokens: record.completionTokens,
      cachedTokens: record.cachedTokens ?? 0,
      costUsd: costUsd.toFixed(6),
      costStatus,
      latencyMs: record.latencyMs,
      outcome: record.outcome,
    })
  } catch (error) {
    failedWrites += 1
    console.warn(`${GATEWAY_LOG.RecordFailed} ${LLM_CALL_TABLE}`, error)
  }
}
