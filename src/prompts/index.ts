/**
 * Prompts Module
 *
 * Centralized prompt management with Langfuse integration.
 */

// Core infrastructure
export { PromptRepository, promptRepository } from './repository'
export type { PromptDefinition, PromptVariables, IPromptRepository } from './types'

// Langfuse sync utilities
export {
  pushPromptToLangfuse,
  pushPromptsToLangfuse,
  fetchPromptFromLangfuse,
  compileLangfusePrompt,
  type LangfuseSyncOptions,
  type SyncResult,
} from './langfuse-sync'

// Storyteller prompts
export {
  STORYTELLER_PROMPTS,
  STORYTELLER_AGENT_SYSTEM,
  PSYCHOLOGIST_AGENT_SYSTEM,
  DEVILS_ADVOCATE_AGENT_SYSTEM,
  GARDENER_AGENT_SYSTEM,
  CONSISTENCY_AGENT_SYSTEM,
  EQ_BENCH_EMOTION_JUDGE,
  EQ_BENCH_MAGIC_JUDGE,
  EQ_BENCH_CONSISTENCY_JUDGE,
} from './storyteller-prompts'

// Registry functions
export { registerCorePrompts } from './registry'
