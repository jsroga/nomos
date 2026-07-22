/** Chat interface UI copy and eval-mode wire constants. */

export const CHAT_EVAL_MODE_STORAGE_KEY = 'STORYTELLER_EVAL_MODE'

export enum ChatEvalLocalValue {
  Enabled = 'true',
  EnabledNumeric = '1',
}

export const CHAT_DEBUG_ADMIN_PIN = '2137'

export enum BrowserStorageEventName {
  Storage = 'storage',
}

export const CHAT_LLM_JUDGE_API_PATH = '/api/llm-judge'

export enum ChatFetchMethod {
  Post = 'POST',
}

export enum ChatMessageType {
  Human = 'human',
}

export enum LlmJudgeRole {
  User = 'user',
  Assistant = 'assistant',
}

export enum LlmJudgeCriterion {
  NarrativeCoherence = 'narrative_coherence',
  CharacterConsistency = 'character_consistency',
  CreativeQuality = 'creative_quality',
  UserGoalAlignment = 'user_goal_alignment',
  PacingAndStructure = 'pacing_and_structure',
}

export const CHAT_EVAL_FAILED_ERROR = 'Evaluation failed'
export const CHAT_EVAL_CONSOLE_PREFIX = 'Evaluation error:'
export const CHAT_EVAL_FAILED_FEEDBACK = 'Evaluation failed. Please try again.'
