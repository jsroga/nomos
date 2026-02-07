/**
 * Evaluation V2 - Langfuse LLM-as-Judge System
 *
 * A comprehensive evaluation system for storyteller and game loop modules
 * with full Langfuse integration for observability and analysis.
 *
 * Core Judges:
 * - MagicScoreJudge: Tracks human beautiful moments (Red Dead, Witcher, Breaking Bad style)
 * - AntiSlopJudge: Detects AI clichés, filler, and weak writing
 * - StoryConsistencyJudge: Ensures facts, characters, world, and timeline consistency
 *
 * @example
 * ```ts
 * import { quickEvaluate, createStorytellerJudges, EvaluationRunnerV2 } from '@/evaluation/v2'
 *
 * // Quick evaluation
 * const result = await quickEvaluate(generatedText, storyContext)
 * console.log(`Magic: ${result.magic}, Slop: ${result.slop}, Consistency: ${result.consistency}`)
 *
 * // Full evaluation run
 * const runner = new EvaluationRunnerV2(createStorytellerJudges(), { name: 'my-eval' })
 * const results = await runner.run(dataset, generateFn)
 * ```
 */

// Types
export * from './types'

// Base
export { BaseLangfuseJudge, buildContextSection } from './base-langfuse-judge'

// Judges - Magic & Beauty
export {
  MagicScoreJudge,
  EmotionalResonanceJudge,
  MemorableMomentsJudge,
} from './judges/magic-score-judge'

// Judges - Anti-Slop
export {
  AntiSlopJudge,
  AuthenticityJudge,
  ClicheJudge,
  SLOP_PATTERNS,
} from './judges/anti-slop-judge'

// Judges - Consistency
export {
  StoryConsistencyJudge,
  CharacterVoiceJudge,
  WorldLogicJudge,
  CompositeConsistencyJudge,
} from './judges/consistency-judge'

// Runner
export {
  EvaluationRunnerV2,
  createStorytellerJudges,
  createQuickJudges,
  createSpecializedJudges,
  quickEvaluate,
} from './runner'

// Re-export for convenience
export type { RunnerConfig, RunnerResult } from './runner'
