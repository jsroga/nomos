/**
 * Benchmark 2.0 Evaluation Suite
 *
 * Comprehensive evaluation framework for AI agents.
 */

// Disable LangChain tracing globally to prevent 429 errors from LangSmith
process.env.LANGCHAIN_TRACING_V2 = 'false'
process.env.LANGSMITH_TRACING = 'false'
process.env.LANGCHAIN_TRACED_BY = ''

// Dataset exports
export * from './datasets/storyteller-golden'
export * from './datasets/loop-creator-golden'
export * from './datasets/guardrail-edge-cases'
export * from './datasets/tools-golden'

// Evaluator exports - Core
export { consistencyEvaluator } from './evaluators/consistency'
export { combinedHallucinationEvaluator } from './evaluators/hallucination'
export { magicScoreEvaluator, AntiSlopValidator } from './evaluators/magic-score'
export { reverseIntentEvaluator } from './evaluators/reverse-intent'
export { narrativeCoherenceEvaluator } from './evaluators/narrative-coherence'

// Evaluator exports - Agent & Orchestration
export { agentRoutingEvaluator, haltingBehaviorEvaluator } from './evaluators/agent-routing'
export { orchestrationEvaluator } from './evaluators/orchestration'

// Evaluator exports - RAG & Retrieval
export { ragGroundingEvaluator, ragGroundingHeuristic } from './evaluators/rag-grounding'
export { retrievalRelevanceEvaluator } from './evaluators/retrieval-relevance'
export { citationAccuracyEvaluator, citationAccuracyHeuristic } from './evaluators/citation-accuracy'

// Evaluator exports - Quality & Efficiency
export { scriptQualityEvaluator, scriptFormatEvaluator } from './evaluators/script-quality'
export { reasoningDepthEvaluator } from './evaluators/reasoning-depth'
export { efficiencyEvaluator } from './evaluators/efficiency-evaluator'

// Evaluator exports - Tool Correctness
export {
    toolOutputEvaluator,
    toolSchemaEvaluator,
    toolConsistencyEvaluator,
    toolCorrectnessEvaluator,
    allToolEvaluators,
} from './evaluators/tool-correctness'

// Experiment exports
export { runStorytellerExperiment, runABTest } from './experiments/storyteller-experiments'

// Reporting
export { generateHtmlReport, saveHtmlReport } from './report-generator'

// Types
export type { EvaluatorResult, CustomEvaluator, EvaluatorInput } from './types'

// ==========================================
// PHASE 10: COGNITIVE ARCHITECTURE EXPORTS
// ==========================================

// EQ-Bench Inspired Evaluators
export { eqEvaluator, logicEvaluator } from './evaluators/eq-evaluator'
export { nuanceEvaluator, calculateSelfCorrectionRate } from './evaluators/self-correction-evaluator'
export { multiHopEmpathyEvaluator, longHorizonArcEvaluator } from './evaluators/advanced-evaluators'
export { manipulationResistanceEvaluator } from './evaluators/safety-evaluator'

// Analysis Utilities
export { calculateTokenEfficiency, mapToConflictSpace, CONFLICT_QUADRANTS } from './analysis/analysis-utils'

// Tools (LangChain DynamicTools)
export { createPsychologistTool, createStoryEngineTool, STORYTELLING_TOOLS } from './tools/storytelling-tools'

// Model Registry
export { getCreativeModel, getEvaluatorModel, getBaselineModel } from './runtime/model-registry'

// Dashboard Components
export { EmotionalTrajectoryChart } from './components/EmotionalTrajectoryChart'

// Architecture Experiments
export { runArchitectureEval } from './experiments/eval-architecture'

// Scenarios
export { HIGH_CONFLICT_SCENARIO, IMPOSSIBLE_TENSION_SCENARIO } from './scenarios/high-conflict'

// Utils
export { safeParseJson } from './utils/json-parser'

