/** Vocabulary for the model gateway's call record. Values only — no logic. */

/**
 * What a call was for. An enum rather than a free string: `'storyteller-beat'`,
 * `'storytellerBeat'` and `'beat-plan'` would otherwise all appear in the same
 * table within a month and the attribution would be worthless.
 */
export enum LlmFeature {
  StorytellerBeatPlan = 'storyteller.beat-plan',
  StorytellerBeatDraft = 'storyteller.beat-draft',
  StorytellerBeatHumanize = 'storyteller.beat-humanize',
  StorytellerChat = 'storyteller.chat',
  StorytellerCharacterFields = 'storyteller.character-fields',
  StorytellerCharacterMbti = 'storyteller.character-mbti',
  StorytellerEntityDescription = 'storyteller.entity-description',
  StorytellerContextualSummary = 'storyteller.contextual-summary',
  StorytellerWorldGenPrompt = 'storyteller.world-gen-prompt',
  StorytellerVisualSubject = 'storyteller.visual-subject',
  Assistant = 'assistant',
  LoopCreator = 'loop-creator',
  GameDesign = 'game-design',
  RagEmbedding = 'rag.embedding',
  RagRerank = 'rag.rerank',
  RagQueryExpansion = 'rag.query-expansion',
}

/** How a call ended. `SchemaFail` is the alias-retirement signal action 18 needs. */
export enum LlmOutcome {
  Ok = 'ok',
  SchemaFail = 'schema_fail',
  Timeout = 'timeout',
  RateLimit = 'rate_limit',
  Refusal = 'refusal',
  Error = 'error',
}

export const LLM_CALL_TABLE = 'llm_calls'

export const GATEWAY_LOG = {
  RecordFailed: '[gateway] failed to record an llm call; generation was unaffected:',
  UnknownModel: '[gateway] no price for model',
  UnpricedRecorded:
    '[gateway] recorded with cost 0 — add a price row in ' +
    'src/shared/ai/gateway/constants/pricing.ts for:',
} as const

/** Recording must never fail a generation — see ADR 0003. */
export const GATEWAY_TIMEOUT_MS = 120_000

/**
 * One retry policy for every call. A retried call costs twice, so each attempt
 * is recorded separately and the SDK's own retry is switched off — otherwise
 * the second charge would be invisible.
 */
export const GATEWAY_MAX_ATTEMPTS = 2
export const GATEWAY_SDK_RETRIES = 0
export const GATEWAY_RETRY_DELAY_MS = 500

/**
 * Substrings that identify a provider failure. Matched against a lowercased
 * message because providers do not agree on error shapes.
 */
export const PROVIDER_ERROR_MARKER = {
  Timeout: 'timeout',
  Aborted: 'aborted',
  RateLimit: 'rate limit',
  RateLimitStatus: '429',
  Refusal: 'refus',
} as const

/** Failures worth retrying. A refusal or a schema failure will not improve. */
export const RETRYABLE_OUTCOMES = [LlmOutcome.Timeout, LlmOutcome.RateLimit] as const

/** Token field names on a Mastra agent result. Same shape as the AI SDK's. */
export const AGENT_USAGE_PROMPT_FIELDS = ['inputTokens', 'promptTokens'] as const
export const AGENT_USAGE_COMPLETION_FIELDS = ['outputTokens', 'completionTokens'] as const
