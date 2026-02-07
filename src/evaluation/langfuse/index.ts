/**
 * Langfuse Evaluation Module
 *
 * EQ-Bench style evaluation with Langfuse integration.
 * Based on arxiv.org/html/2312.06281v2 methodology.
 */

export {
  EQBenchEvaluator,
  getEQBenchEvaluator,
  quickEQBenchEval,
  type EQBenchConfig,
  type EmotionJudgeOutput,
  type MagicJudgeOutput,
  type ConsistencyJudgeOutput,
  EmotionScoresSchema,
  EmotionJudgeOutputSchema,
  MagicJudgeOutputSchema,
  ConsistencyJudgeOutputSchema,
  DEFAULT_EQ_BENCH_CONFIG,
} from './eq-bench-evaluator'
