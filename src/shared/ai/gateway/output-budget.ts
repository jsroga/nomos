/**
 * Clamp and apply OpenRouter completion reservations.
 * Constants live in `constants/output-budget.ts` (no functions there).
 * Same-folder imports stay relative — Mastra Studio emits unresolved `@/` into `.mastra/output`.
 */
import { wrapLanguageModel } from 'ai'
import { LlmFeature } from './constants/llm-call'
import {
  LLM_COMPLETION_BUDGET,
  LLM_FEATURE_TRANSPORT,
  LlmTransportKind,
  OPENROUTER_OUTPUT_CEILING,
  OPENROUTER_OUTPUT_DEFAULT,
  OutputBudgetMiddlewareSpec,
  type LlmCompletionFeature,
} from './constants/output-budget'

type OpenRouterLanguageModel = Parameters<typeof wrapLanguageModel>[0]['model']

export function isLlmCompletionFeature(feature: LlmFeature): feature is LlmCompletionFeature {
  return LLM_FEATURE_TRANSPORT[feature] === LlmTransportKind.Completion
}

export function clampOpenRouterOutputTokens(
  requested: number | undefined | null,
  fallback: number,
  ceiling: number = OPENROUTER_OUTPUT_CEILING,
): number {
  if (requested == null || !Number.isFinite(requested) || requested <= 0) {
    return fallback
  }
  const floored = Math.floor(requested)
  if (floored > ceiling) return ceiling
  return floored
}

export function resolveGatewayMaxOutputTokens(
  feature: LlmCompletionFeature,
  requested?: number,
): number {
  return clampOpenRouterOutputTokens(requested, LLM_COMPLETION_BUDGET[feature])
}

export interface MastraCompletionSettingsPatch {
  temperature?: number
  maxOutputTokens?: number
  roleBudget?: number
}

export function resolveMastraMaxOutputTokens(
  feature: LlmCompletionFeature,
  patch: MastraCompletionSettingsPatch = {},
): number {
  return clampOpenRouterOutputTokens(
    patch.maxOutputTokens ?? patch.roleBudget ?? LLM_COMPLETION_BUDGET[feature],
    OPENROUTER_OUTPUT_DEFAULT,
  )
}

export function mastraCompletionSettings(
  feature: LlmCompletionFeature,
  patch: MastraCompletionSettingsPatch = {},
): { modelSettings: { maxOutputTokens: number; temperature?: number } } {
  const maxOutputTokens = resolveMastraMaxOutputTokens(feature, patch)
  if (patch.temperature === undefined) {
    return { modelSettings: { maxOutputTokens } }
  }
  return { modelSettings: { maxOutputTokens, temperature: patch.temperature } }
}

export function withOpenRouterOutputBudget(
  model: OpenRouterLanguageModel,
): OpenRouterLanguageModel {
  return wrapLanguageModel({
    model,
    middleware: {
      specificationVersion: OutputBudgetMiddlewareSpec.V3,
      transformParams: async ({ params }) => ({
        ...params,
        maxOutputTokens: clampOpenRouterOutputTokens(
          params.maxOutputTokens,
          OPENROUTER_OUTPUT_DEFAULT,
        ),
      }),
    },
  })
}
