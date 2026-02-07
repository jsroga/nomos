/**
 * Evaluation Suite Type Definitions
 */

export interface EvaluationExample {
  id: string
  input: Record<string, unknown>
  expected?: Record<string, unknown>
  metadata?: Record<string, unknown>
  scenario?: string
}

export interface DatasetConfig {
  name: string
  description: string
  examples: EvaluationExample[]
}

export interface EvaluatorResult {
  score: number
  reasoning: string
  metadata?: Record<string, unknown>
}

export interface EvaluatorInput {
  input: Record<string, unknown>
  output: Record<string, unknown>
  reference?: Record<string, unknown>
}

export interface CustomEvaluator {
  name: string
  evaluate: (params: EvaluatorInput) => Promise<EvaluatorResult>
}

export interface ExperimentConfig {
  datasetName: string
  evaluators: CustomEvaluator[]
  experimentPrefix: string
  maxConcurrency?: number
  metadata?: Record<string, unknown>
}

export interface ExperimentResult {
  experimentId: string
  datasetName: string
  results: Array<{
    exampleId: string
    scores: Record<string, number>
    reasoning: Record<string, string>
  }>
  aggregatedScores: Record<string, number>
  timestamp: Date
}

// Agent-specific types for evaluation
export interface StorytellerEvalInput {
  message: string
  projectId?: string
  episodeId?: string
  phase?: string
}

export interface StorytellerEvalOutput {
  response: string
  delegatedAgents?: string[]
  actions?: string[]
  awaitingInput?: boolean
  citations?: string[]
}

export interface LoopCreatorEvalInput {
  message: string
  gameContext?: {
    genre?: string
    platform?: string
    audience?: string
  }
}

export interface LoopCreatorEvalOutput {
  response: string
  mechanics?: Array<{ id: string; name: string }>
  loops?: Array<{ id: string; name: string }>
  balanceScore?: number
}

// ============================================
// MULTI-VARIANT DASHBOARD TYPES
// ============================================

export interface ScenarioMetrics {
  magicScore: number
  consistency: number
  orchestration: number
  latencyMs?: number
  costUsd?: number
}

export interface VariantReport {
  name: string
  config: Record<string, unknown>
  overallMetrics: ScenarioMetrics
  scenarioMetrics: Record<string, ScenarioMetrics>
  exampleLogs?: ExampleLog[] // New: for detail view
}

export interface ExampleLog {
  id: string
  scenario: string
  input: string
  output: string
  score: number
  reasoning: Record<string, string>
  context?: Record<string, unknown>
}

export interface MultiVariantReport {
  id: string
  timestamp: string
  variants: VariantReport[]
  scenarios: string[]
  e2eVariants?: any[]
}

// ============================================
// MULTI-PASS ARCHITECTURE TYPES (PHASE 9)
// ============================================

export interface MultiPassScore {
  firstPass: number
  revised: number
  lift: number
}

export interface MultiPassExampleLog extends ExampleLog {
  passDetails?: {
    firstPassOutput: string
    critique: string
    revisedOutput: string
    scores: {
      firstPass: Record<string, number>
      revised: Record<string, number>
    }
  }
}

export interface MultiPassVariantReport extends Omit<VariantReport, 'exampleLogs'> {
  exampleLogs?: MultiPassExampleLog[]
  architecture: 'Zero-Shot' | 'Reflexion' | 'Retrieval' | 'Hierarchical'
  averageLift?: number // % improvement from revision
}
