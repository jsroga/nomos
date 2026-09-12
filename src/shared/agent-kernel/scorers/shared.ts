import { env } from '@/shared/config/env'
import { isE2eLlmPinned } from '@/shared/ai/gateway/e2e-llm-pin'
import { E2eLlmPinError } from '@/shared/ai/gateway/constants/e2e-llm-pin'
import type { ScorerJudgeConfig } from '@mastra/core/evals'
import { wrapLanguageModel } from 'ai'
import { MODELS, toOpenRouterModel, toOpenRouterModelId, createPureChatModel } from '@/shared/agent-kernel/models'
import { getConfiguredModel } from '@/shared/agent-kernel/model-settings'
import { isPlainObject } from '@/shared/data/json-guards'
import { ScorerOutputField, LanguageModelMiddlewareSpec } from '@/shared/agent-kernel/scorers/constants/shared'
import { ScorerInspectField, ScorerInspectMarker } from '@/shared/agent-kernel/scorers/constants/inspect'
import { clampOpenRouterOutputTokens } from '@/shared/ai/gateway/output-budget'
import { OPENROUTER_JUDGING_OUTPUT_CEILING } from '@/shared/ai/gateway/constants/output-budget'

function stripWorkspacePack(text: string): string {
  const index = text.indexOf(ScorerInspectMarker.Iq200)
  if (index === -1) return text
  return text.slice(0, index).trim()
}

function isAgentEnvelope(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value) && ScorerInspectField.InputMessages in value
}

const JUDGING_ROLE = 'judging'

/** OpenRouter reserves max_tokens against remaining credits; unbounded Sol is 65536. */
export const JUDGING_MAX_OUTPUT_TOKENS = OPENROUTER_JUDGING_OUTPUT_CEILING

export function toMastraJudgingModel(): string {
  if (isE2eLlmPinned()) {
    throw new Error(E2eLlmPinError.JudgingForbidden)
  }
  // Read at call time so evals/run.ts can load .env.local before scorer modules import.
  // admin panel setting → JUDGING_MODEL env → default; routed through the OpenRouter gateway.
  return toOpenRouterModel(
    getConfiguredModel(JUDGING_ROLE) || env.JUDGING_MODEL || MODELS.judging.primary
  )
}

export function toMastraJudgingLanguageModel() {
  return wrapLanguageModel({
    model: createPureChatModel(toOpenRouterModelId(toMastraJudgingModel())),
    middleware: {
      specificationVersion: LanguageModelMiddlewareSpec.V3,
      transformParams: async ({ params }) => ({
        ...params,
        maxOutputTokens: clampOpenRouterOutputTokens(
          params.maxOutputTokens,
          JUDGING_MAX_OUTPUT_TOKENS,
          JUDGING_MAX_OUTPUT_TOKENS,
        ),
      }),
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
  if (typeof output === 'string') return stripWorkspacePack(output)
  if (isAgentEnvelope(output)) return ''
  if (output && typeof output === 'object' && ScorerOutputField.Response in output) {
    return stripWorkspacePack(String(output.response))
  }
  if (Array.isArray(output)) return extractProse(output)
  return stripWorkspacePack(JSON.stringify(output))
}

/**
 * Prose text from a workflow-step or eval output: accepts a raw string or the
 * beat-draft step records ({ draft } / { finalDraft }); falls back to JSON.
 */
export function extractProse(output: unknown): string {
  if (typeof output === 'string') return stripWorkspacePack(output)
  if (isAgentEnvelope(output)) return ''
  if (Array.isArray(output)) {
    for (let index = output.length - 1; index >= 0; index -= 1) {
      const row = output[index]
      if (!isPlainObject(row)) continue
      if (row[ScorerInspectField.Role] === ScorerInspectField.Assistant) {
        const content = row[ScorerInspectField.Content]
        if (typeof content === 'string') return stripWorkspacePack(content)
      }
    }
  }
  if (output && typeof output === 'object') {
    if (ScorerOutputField.Draft in output && typeof output.draft === 'string') {
      return stripWorkspacePack(output.draft)
    }
    if (ScorerOutputField.FinalDraft in output && typeof output.finalDraft === 'string') {
      return stripWorkspacePack(output.finalDraft)
    }
  }
  return stripWorkspacePack(JSON.stringify(output ?? ''))
}

export function inputRecord(input: unknown): Record<string, unknown> {
  if (isPlainObject(input)) return input
  return { value: input }
}
