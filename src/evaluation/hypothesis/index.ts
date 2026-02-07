/**
 * Hypothesis-Driven Evaluation Framework
 * 
 * A framework for testing storyteller improvements through:
 * 1. Hypothesis definition (what we're testing)
 * 2. Conversation simulation (executing test scenarios)
 * 3. Output capture (world bible, beats, script)
 * 4. DeepEval evaluation (scientific metrics)
 * 5. Recommendation generation (actionable improvements)
 */

export * from './types'
export * from './conversation-simulator'
export * from './output-capture'
export * from './recommendation-generator'
export { runHypothesisExperiment } from './run-experiment'
