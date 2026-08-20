import type { ScorerJudgeConfig } from '@mastra/core/evals'
import { wrapLanguageModel } from 'ai'
import { MODELS, toOpenRouterModel, toOpenRouterModelId, createPureChatModel } from '@/shared/agent-kernel/models'
import { getConfiguredModel } from '@/shared/agent-kernel/model-settings'
import { isPlainObject } from '@/shared/data/json-guards'
import { ScorerOutputField, LanguageModelMiddlewareSpec } from '@/shared/agent-kernel/scorers/constants/shared'

const JUDGING_ROLE = 'judging'

/** OpenRouter reserves max_tokens against remaining credits; unbounded Sol is 65536. */
export const JUDGING_MAX_OUTPUT_TOKENS = 1024

export function toMastraJudgingModel(): string {
  // Read at call time so evals/run.ts can load .env.local before scorer modules import.
  // admin panel setting → JUDGING_MODEL env → default; routed through the OpenRouter gateway.
  return toOpenRouterModel(
    getConfiguredModel(JUDGING_ROLE) || process.env.JUDGING_MODEL || MODELS.judging.primary
  )
}

export function toMastraJudgingLanguageModel() {
  return wrapLanguageModel({
    model: createPureChatModel(toOpenRouterModelId(toMastraJudgingModel())),
    middleware: {
      specificationVersion: LanguageModelMiddlewareSpec.V3,
      transformParams: async ({ params }) => {
        if (params.maxOutputTokens != null) return params
        return { ...params, maxOutputTokens: JUDGING_MAX_OUTPUT_TOKENS }
      },
    },
  })
}

/**
 * OpenRouter chat completions cannot host Mastra's Responses-API tool schema
 * for structured output. Inject the JSON schema in the judge prompt instead.
 */
export function createJudgingConfig(instructions: string): ScorerJudgeConfig {
  return {
    model: toMastraJudgingLanguageModel(),
    instructions,
    jsonPromptInjection: true,
  }
}

export function normalizeScore(score: number): number {
  return Math.max(0, Math.min(1, score))
}

export function outputToString(output: unknown): string {
  if (typeof output === 'string') return output
  if (output && typeof output === 'object' && ScorerOutputField.Response in output) {
    return String(output.response)
  }
  return JSON.stringify(output)
}

/**
 * Prose text from a workflow-step or eval output: accepts a raw string or the
 * beat-draft step records ({ draft } / { finalDraft }); falls back to JSON.
 */
export function extractProse(output: unknown): string {
  if (typeof output === 'string') return output
  if (output && typeof output === 'object') {
    if (ScorerOutputField.Draft in output && typeof output.draft === 'string') return output.draft
    if (ScorerOutputField.FinalDraft in output && typeof output.finalDraft === 'string') return output.finalDraft
  }
  return JSON.stringify(output ?? '')
}

export function inputRecord(input: unknown): Record<string, unknown> {
  if (isPlainObject(input)) return input
  return { value: input }
}
