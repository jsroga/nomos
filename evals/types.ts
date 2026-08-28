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

/**
 * The minimal example shape `evals/run.ts` consumes for any dataset: an input
 * record + a reference output to score, plus per-example scorer scoping. Both
 * the storyteller golden set and the idea-diversity dataset conform to this.
 */
export interface RunnableEvalExample {
  id: string
  input: Record<string, unknown>
  referenceOutput: string
  metadata: {
    category: string
    description?: string
    /** When set, only these scorer ids run for this example. */
    scorers?: readonly string[]
  }
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
  /** Per-scorer average across the run — dataset-agnostic summary. */
  scorerAverages?: Record<string, number>
  exampleLogs?: ExampleLog[]
}

/**
 * A scorer that threw. Kept apart from the scores, because the runner used to
 * record a failure as `0` — which is how a run where every judge failed on a
 * missing API key became a committed baseline of all zeros.
 */
export interface ScorerFailure {
  exampleId: string
  scorerId: string
  error: string
}

export interface MultiVariantReport {
  id: string
  timestamp: string
  /** Hash of the prompts, agents and datasets this run scored. */
  inputHash?: string
  /** What the judges cost. Never recorded to `llm_calls` — see ADR 0003. */
  judgeUsage?: { inputTokens: number; outputTokens: number; costUsd: number; unpricedModels: string[] }
  variants: VariantReport[]
  scenarios: string[]
  /** Empty on a clean run. A non-empty list makes the run exit non-zero. */
  failures: ScorerFailure[]
}

export interface ScorerRunResult {
  exampleId: string
  /** Only scorers that actually produced a score. Failures are not zeros. */
  scores: Record<string, number>
  reasoning: Record<string, string>
  input: Record<string, unknown>
  output: string
  metadata?: Record<string, unknown>
}
