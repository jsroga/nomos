/**
 * Types for DeepEval Python Bridge
 *
 * These types mirror the JSON format expected by scripts/deepeval/evaluate.py
 */

export interface DeepEvalTestCase {
  /** User prompt / input */
  input: string
  /** Content to evaluate */
  actualOutput: string
  /** Optional baseline for comparison */
  expectedOutput?: string
  /** Context items for the evaluator */
  context?: string[]
}

export interface DeepEvalInput {
  /** Test cases to evaluate */
  testCases: DeepEvalTestCase[]
  /** Optional: filter to specific metrics */
  metrics?: string[]
  /** Optional: hypothesis metadata */
  hypothesis?: {
    id: string
    name: string
    variable?: {
      type: string
      baseline: unknown
      variant: unknown
    }
  }
}

export interface DeepEvalMetricResult {
  /** Metric name */
  name: string
  /** Score from 0.0 to 1.0 */
  score: number
  /** Whether the score meets the threshold */
  success: boolean
  /** Explanation from the LLM judge */
  reason: string
  /** The threshold for this metric */
  threshold?: number
}

export interface DeepEvalTestCaseResult {
  /** Truncated input for reference */
  input: string
  /** Results for each metric */
  metrics: DeepEvalMetricResult[]
}

export interface DeepEvalOutput {
  /** Whether evaluation succeeded */
  success: boolean
  /** Results for each test case */
  testCases: DeepEvalTestCaseResult[]
  /** Error message if success is false */
  error?: string
  /** Timestamp of evaluation */
  timestamp?: string
  /** Which metrics were run */
  metricsRun?: string[]
}

/** Available metric names */
export const DEEPEVAL_METRICS = [
  'EQ-Bench Magic Score',
  'Anti-Slop Score',
  'EQ-Bench Consistency',
  'Mazur Character Voice',
  'Mazur Narrative Coherence',
  'Gilligan-Martin Quality',
] as const

type DeepEvalMetricName = (typeof DEEPEVAL_METRICS)[number]
