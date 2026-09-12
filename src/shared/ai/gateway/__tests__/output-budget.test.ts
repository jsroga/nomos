import { describe, expect, it } from 'vitest'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import {
  LLM_COMPLETION_BUDGET,
  LLM_FEATURE_TRANSPORT,
  LlmTransportKind,
  OPENROUTER_OUTPUT_CEILING,
  OPENROUTER_OUTPUT_DEFAULT,
  OPENROUTER_JUDGING_OUTPUT_CEILING,
  type LlmCompletionFeature,
} from '@/shared/ai/gateway/constants/output-budget'
import {
  clampOpenRouterOutputTokens,
  isLlmCompletionFeature,
  mastraCompletionSettings,
  resolveGatewayMaxOutputTokens,
} from '@/shared/ai/gateway/output-budget'
import type { EmbedRequest } from '@/shared/ai/gateway'

type MissingCompletionBudget = Exclude<
  LlmCompletionFeature,
  keyof typeof LLM_COMPLETION_BUDGET
>
type ExhaustiveCompletionBudget = [MissingCompletionBudget] extends [never] ? true : never
const _exhaustiveBudget: ExhaustiveCompletionBudget = true
void _exhaustiveBudget

type EmbedRequestMaxOutput = 'maxOutputTokens' extends keyof EmbedRequest ? true : false
const _embedHasNoMaxOutputTokens: EmbedRequestMaxOutput = false
void _embedHasNoMaxOutputTokens

describe('clampOpenRouterOutputTokens', () => {
  const fallback = 8000

  it.each([
    { requested: undefined, expected: fallback },
    { requested: null, expected: fallback },
    { requested: Number.NaN, expected: fallback },
    { requested: Number.POSITIVE_INFINITY, expected: fallback },
    { requested: Number.NEGATIVE_INFINITY, expected: fallback },
    { requested: 0, expected: fallback },
    { requested: -1, expected: fallback },
    { requested: 1.9, expected: 1 },
    { requested: 131_072, expected: OPENROUTER_OUTPUT_CEILING },
    { requested: OPENROUTER_OUTPUT_CEILING, expected: OPENROUTER_OUTPUT_CEILING },
    { requested: 256, expected: 256 },
  ])('maps $requested to $expected', ({ requested, expected }) => {
    expect(clampOpenRouterOutputTokens(requested, fallback)).toBe(expected)
  })

  it('uses a judging hard ceiling', () => {
    expect(
      clampOpenRouterOutputTokens(8000, OPENROUTER_JUDGING_OUTPUT_CEILING, OPENROUTER_JUDGING_OUTPUT_CEILING)
    ).toBe(OPENROUTER_JUDGING_OUTPUT_CEILING)
    expect(
      clampOpenRouterOutputTokens(256, OPENROUTER_JUDGING_OUTPUT_CEILING, OPENROUTER_JUDGING_OUTPUT_CEILING)
    ).toBe(256)
    expect(
      clampOpenRouterOutputTokens(undefined, OPENROUTER_JUDGING_OUTPUT_CEILING, OPENROUTER_JUDGING_OUTPUT_CEILING)
    ).toBe(OPENROUTER_JUDGING_OUTPUT_CEILING)
  })
})

describe('LLM_COMPLETION_BUDGET table', () => {
  it('caps every completion budget at the OpenRouter ceiling', () => {
    for (const feature of Object.values(LlmFeature)) {
      if (!isLlmCompletionFeature(feature)) continue
      expect(LLM_COMPLETION_BUDGET[feature]).toBeLessThanOrEqual(OPENROUTER_OUTPUT_CEILING)
    }
  })

  it('keeps embedding and rerank off the completion budget', () => {
    expect(LLM_FEATURE_TRANSPORT[LlmFeature.RagEmbedding]).toBe(LlmTransportKind.Embedding)
    expect(LLM_FEATURE_TRANSPORT[LlmFeature.RagRerank]).toBe(LlmTransportKind.Rerank)
    expect(isLlmCompletionFeature(LlmFeature.RagEmbedding)).toBe(false)
    expect(isLlmCompletionFeature(LlmFeature.RagRerank)).toBe(false)
    expect(Object.hasOwn(LLM_COMPLETION_BUDGET, LlmFeature.RagEmbedding)).toBe(false)
    expect(Object.hasOwn(LLM_COMPLETION_BUDGET, LlmFeature.RagRerank)).toBe(false)
  })

  it('uses the contracted per-feature reservations', () => {
    expect(LLM_COMPLETION_BUDGET[LlmFeature.StorytellerChat]).toBe(8000)
    expect(LLM_COMPLETION_BUDGET[LlmFeature.StorytellerBeatDraft]).toBe(8000)
    expect(LLM_COMPLETION_BUDGET[LlmFeature.StorytellerArtifactDraft]).toBe(8000)
    expect(LLM_COMPLETION_BUDGET[LlmFeature.LoopCreator]).toBe(8000)
    expect(LLM_COMPLETION_BUDGET[LlmFeature.GameDesign]).toBe(8000)
    expect(LLM_COMPLETION_BUDGET[LlmFeature.Assistant]).toBe(8000)
    expect(LLM_COMPLETION_BUDGET[LlmFeature.StorytellerEntityDescription]).toBe(1024)
    expect(LLM_COMPLETION_BUDGET[LlmFeature.StorytellerEntityDescription]).not.toBe(
      LLM_COMPLETION_BUDGET[LlmFeature.StorytellerArtifactDraft]
    )
    expect(LLM_COMPLETION_BUDGET[LlmFeature.StorytellerContextualSummary]).toBe(2048)
    expect(LLM_COMPLETION_BUDGET[LlmFeature.StorytellerContextualSummary]).toBeGreaterThan(512)
    expect(LLM_COMPLETION_BUDGET[LlmFeature.StorytellerScriptEdit]).toBe(8000)
    expect(LLM_COMPLETION_BUDGET[LlmFeature.ChatSessionTitle]).toBe(256)
  })

  it('resolves gateway overrides through the clamp', () => {
    expect(resolveGatewayMaxOutputTokens(LlmFeature.StorytellerContextualSummary)).toBe(2048)
    expect(resolveGatewayMaxOutputTokens(LlmFeature.StorytellerArtifactDraft)).toBe(8000)
    expect(resolveGatewayMaxOutputTokens(LlmFeature.StorytellerArtifactDraft, 131_072)).toBe(
      OPENROUTER_OUTPUT_CEILING
    )
  })

  it('always emits modelSettings.maxOutputTokens from mastraCompletionSettings', () => {
    const temperatureOnly = mastraCompletionSettings(LlmFeature.LoopCreator, { temperature: 0.4 })
    expect(temperatureOnly.modelSettings.maxOutputTokens).toBe(OPENROUTER_OUTPUT_DEFAULT)
    expect(temperatureOnly.modelSettings.temperature).toBe(0.4)
    expect(
      mastraCompletionSettings(LlmFeature.StorytellerBeatPlan, { roleBudget: 2000 }).modelSettings
        .maxOutputTokens
    ).toBe(2000)
  })
})
