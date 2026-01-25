/**
 * LangSmith Evaluation Suite
 *
 * Comprehensive evaluation framework for AI agents using LangSmith.
 *
 * Usage:
 * - Run experiments: npm run eval:storyteller
 * - Upload datasets: npm run eval:upload-datasets
 * - View results: https://smith.langchain.com
 */

// Dataset exports
export * from './datasets/storyteller-golden'
export * from './datasets/loop-creator-golden'
export * from './datasets/guardrail-edge-cases'
export * from './datasets/tools-golden'
export { uploadAllDatasets } from './datasets/upload'

// Evaluator exports
export { ragGroundingEvaluator, ragGroundingHeuristic } from './evaluators/rag-grounding'
export { consistencyEvaluator, consistencyHeuristic } from './evaluators/consistency'
export { hallucinationDetector, hallucinationHeuristic } from './evaluators/hallucination'
export { agentRoutingEvaluator, haltingBehaviorEvaluator } from './evaluators/agent-routing'
export { scriptQualityEvaluator, scriptFormatEvaluator } from './evaluators/script-quality'
export {
  magicScoreEvaluator,
  AntiSlopValidator,
} from './evaluators/magic-score'
export {
  retrievalRelevanceEvaluator,
  retrievalRelevanceHeuristic,
} from './evaluators/retrieval-relevance'
export { reasoningDepthEvaluator, reasoningDepthHeuristic } from './evaluators/reasoning-depth'
export {
  citationAccuracyEvaluator,
  citationAccuracyHeuristic,
} from './evaluators/citation-accuracy'
export {
  toolOutputEvaluator,
  toolSchemaEvaluator,
  toolConsistencyEvaluator,
  toolCorrectnessEvaluator,
  allToolEvaluators,
} from './evaluators/tool-correctness'

// Experiment exports
export { runStorytellerExperiment } from './experiments/storyteller'
export { runLoopCreatorExperiment } from './experiments/loop-creator'
export { runAllExperiments } from './experiments/run-all'
export { runParallelEvaluation } from './experiments/parallel-storyteller'
export { runToolsExperiment, runSingleTest } from './experiments/tools'

// Regression detection
export { detectRegressions, loadBaseline, saveBaseline } from './regression/detector'
export type { RegressionReport, RegressionItem } from './regression/detector'

// Online monitoring
export { setupOnlineEvaluation, OnlineEvaluationConfig } from './online/monitor'

// Types
export type { EvaluationExample, DatasetConfig, EvaluatorResult } from './types'
