/**
 * Evaluation Suite Type Definitions
 */

export interface EvaluationExample {
  id: string
  input: Record<string, unknown>
  expected?: Record<string, unknown>
  metadata?: Record<string, unknown>
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
