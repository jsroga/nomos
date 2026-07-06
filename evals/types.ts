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

export interface StorytellerEvalInput {
  message: string
  projectId?: string
  episodeId?: string
  phase?: string
}

export interface ScenarioMetrics {
  magicScore: number
  consistency: number
  hallucination: number
  personaFidelity: number
  latencyMs?: number
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

export interface VariantReport {
  name: string
  config: Record<string, unknown>
  overallMetrics: ScenarioMetrics
  scenarioMetrics: Record<string, ScenarioMetrics>
  exampleLogs?: ExampleLog[]
}

export interface MultiVariantReport {
  id: string
  timestamp: string
  variants: VariantReport[]
  scenarios: string[]
}

export interface ScorerRunResult {
  exampleId: string
  scores: Record<string, number>
  reasoning: Record<string, string>
  input: Record<string, unknown>
  output: string
  metadata?: Record<string, unknown>
}
