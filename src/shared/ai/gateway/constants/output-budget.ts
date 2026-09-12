/**
 * OpenRouter completion reservation contract. Values only — clamp and wrap
 * live in `output-budget.ts`. OpenRouter reserves against the declared cap,
 * not against tokens used; omitting the field sends GLM’s 131072 default.
 */
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'

export enum LlmTransportKind {
  Completion = 'completion',
  Embedding = 'embedding',
  Rerank = 'rerank',
}

export enum LlmFinishReason {
  Length = 'length',
  Stop = 'stop',
  Unknown = 'unknown',
}

export enum OutputBudgetMiddlewareSpec {
  V3 = 'v3',
}

/** Never send a larger completion reservation than this. */
export const OPENROUTER_OUTPUT_CEILING = 16_384

/** When Mastra / wrapLanguageModel omit maxOutputTokens. */
export const OPENROUTER_OUTPUT_DEFAULT = 8_000

/** Eval judges: omit fallback and hard ceiling. */
export const OPENROUTER_JUDGING_OUTPUT_CEILING = 1_024

export const LLM_FEATURE_TRANSPORT = {
  [LlmFeature.StorytellerBeatPlan]: LlmTransportKind.Completion,
  [LlmFeature.StorytellerBeatDraft]: LlmTransportKind.Completion,
  [LlmFeature.StorytellerBeatHumanize]: LlmTransportKind.Completion,
  [LlmFeature.StorytellerChat]: LlmTransportKind.Completion,
  [LlmFeature.StorytellerScriptEdit]: LlmTransportKind.Completion,
  [LlmFeature.StorytellerScriptGhost]: LlmTransportKind.Completion,
  [LlmFeature.StorytellerCharacterFields]: LlmTransportKind.Completion,
  [LlmFeature.StorytellerCharacterMbti]: LlmTransportKind.Completion,
  [LlmFeature.StorytellerEntityDescription]: LlmTransportKind.Completion,
  [LlmFeature.StorytellerArtifactDraft]: LlmTransportKind.Completion,
  [LlmFeature.StorytellerContextualSummary]: LlmTransportKind.Completion,
  [LlmFeature.StorytellerWorldGenPrompt]: LlmTransportKind.Completion,
  [LlmFeature.StorytellerVisualSubject]: LlmTransportKind.Completion,
  [LlmFeature.Assistant]: LlmTransportKind.Completion,
  [LlmFeature.ChatSessionTitle]: LlmTransportKind.Completion,
  [LlmFeature.LoopCreator]: LlmTransportKind.Completion,
  [LlmFeature.GameDesign]: LlmTransportKind.Completion,
  [LlmFeature.RagQueryExpansion]: LlmTransportKind.Completion,
  [LlmFeature.RagEmbedding]: LlmTransportKind.Embedding,
  [LlmFeature.RagRerank]: LlmTransportKind.Rerank,
} as const satisfies Record<LlmFeature, LlmTransportKind>

export type LlmCompletionFeature = {
  [K in LlmFeature]: (typeof LLM_FEATURE_TRANSPORT)[K] extends LlmTransportKind.Completion
    ? K
    : never
}[LlmFeature]

export const LLM_COMPLETION_BUDGET = {
  [LlmFeature.StorytellerBeatPlan]: 4_000,
  [LlmFeature.StorytellerBeatDraft]: 8_000,
  [LlmFeature.StorytellerBeatHumanize]: 8_000,
  [LlmFeature.StorytellerChat]: 8_000,
  [LlmFeature.StorytellerScriptEdit]: 8_000,
  [LlmFeature.StorytellerScriptGhost]: 1_024,
  [LlmFeature.StorytellerCharacterFields]: 2_048,
  [LlmFeature.StorytellerCharacterMbti]: 1_024,
  [LlmFeature.StorytellerEntityDescription]: 1_024,
  [LlmFeature.StorytellerArtifactDraft]: 8_000,
  [LlmFeature.StorytellerContextualSummary]: 2_048,
  [LlmFeature.StorytellerWorldGenPrompt]: 1_024,
  [LlmFeature.StorytellerVisualSubject]: 1_024,
  [LlmFeature.Assistant]: 8_000,
  [LlmFeature.ChatSessionTitle]: 256,
  [LlmFeature.LoopCreator]: 8_000,
  [LlmFeature.GameDesign]: 8_000,
  [LlmFeature.RagQueryExpansion]: 1_024,
} as const satisfies Record<LlmCompletionFeature, number>
