/**
 * Confident AI Integration
 * 
 * TypeScript integration with Confident AI's Evals API for
 * running storyteller evaluations with shareable result URLs.
 * 
 * Usage:
 *   npm run eval confident-ai       # Full evaluation
 *   npm run eval confident-ai-quick # Quick evaluation
 * 
 * Or programmatically:
 *   import { runExperiment } from '@/evaluation/confident-ai'
 *   const result = await runExperiment({ name: 'My Test', collection: 'quick' })
 *   console.log(result.url)
 */

// Client
export { 
  ConfidentAIClient, 
  getConfidentAIClient,
  getTestRunUrl,
  type ConfidentAIConfig,
  type LLMTestCase,
  type ConversationalTestCase,
  type CreateMetricRequest,
  type CreateMetricCollectionRequest,
  type EvaluateRequest,
  type TestRunResponse,
  type TestRunDetails,
} from './client'

// Adapter
export {
  toConfidentAITestCase,
  toConfidentAITestCases,
  toConfidentAITestCaseWithOutput,
  toConversationalTestCase,
  extractExpectedBehavior,
  groupByCategory,
  filterExamples,
  type ExpectedBehavior,
} from './adapter'

// Metrics
export {
  MAGIC_SCORE_METRIC,
  ANTI_SLOP_METRIC,
  CONSISTENCY_METRIC,
  CHARACTER_VOICE_METRIC,
  NARRATIVE_COHERENCE_METRIC,
  PRESTIGE_TV_METRIC,
  STORYTELLER_METRICS,
  getMetricNames,
} from './metrics'

// Setup
export {
  ensureMetricsExist,
  ensureCollectionExists,
  setupConfidentAI,
  getCollectionNames,
} from './setup'

// Datasets
export {
  pushGoldenDataset,
  pushQuickDataset,
  getTestCasesForEvaluation,
  getDatasetStats,
  printDatasetSummary,
} from './datasets'

// Experiment Runner
export {
  runExperiment,
  type ExperimentConfig,
  type ExperimentResult,
} from './run-experiment'
