/**
 * What a run of the judges cost.
 *
 * Read off Mastra's scorer result, not out of `llm_calls`. ADR 0003 keeps judge
 * calls out of that table on purpose — they score a golden set, not a tenant's
 * work, and recording them there would inflate per-project spend and make this
 * budget measure the wrong thing. Only the committed price table is shared, and
 * pricing a number writes nothing.
 */
import { costUsdFor } from '@/shared/ai/gateway/record'
import { readNumber, readString, recordFromJson } from '@/shared/data/json-guards'

export interface JudgeUsage {
  inputTokens: number
  outputTokens: number
  costUsd: number
  /** Models seen but absent from the price table; their cost is not counted. */
  unpricedModels: string[]
}

export const EMPTY_JUDGE_USAGE: JudgeUsage = {
  inputTokens: 0,
  outputTokens: 0,
  costUsd: 0,
  unpricedModels: [],
}

function executionsOf(result: unknown): Record<string, unknown>[] {
  const judge = recordFromJson(recordFromJson(result).judge)
  return Object.values(judge).flatMap(step => {
    const executions = recordFromJson(step).executions
    return Array.isArray(executions) ? executions.map(recordFromJson) : []
  })
}

/**
 * Tokens and USD for one scorer run. An unpriced model is *named* rather than
 * silently costed at zero — a zero here would read as "the judges were free".
 */
export function judgeUsageOf(result: unknown, fallbackModel: string): JudgeUsage {
  let inputTokens = 0
  let outputTokens = 0
  let costUsd = 0
  const unpricedModels = new Set<string>()

  for (const execution of executionsOf(result)) {
    const usage = recordFromJson(execution.usage)
    const input = readNumber(usage.inputTokens) ?? 0
    const output = readNumber(usage.outputTokens) ?? 0
    inputTokens += input
    outputTokens += output

    const model = readString(execution.judgeModelId) ?? fallbackModel
    try {
      costUsd += costUsdFor(model, input, output)
    } catch {
      unpricedModels.add(model)
    }
  }

  return { inputTokens, outputTokens, costUsd, unpricedModels: [...unpricedModels] }
}

export function addJudgeUsage(total: JudgeUsage, next: JudgeUsage): JudgeUsage {
  return {
    inputTokens: total.inputTokens + next.inputTokens,
    outputTokens: total.outputTokens + next.outputTokens,
    costUsd: total.costUsd + next.costUsd,
    unpricedModels: [...new Set([...total.unpricedModels, ...next.unpricedModels])],
  }
}
