/**
 * Hypothesis-Driven Evaluation Types
 *
 * These types define the structure for hypothesis experiments that:
 * 1. Define a testable hypothesis about prompt/model/flow changes
 * 2. Plan a conversation flow to test the hypothesis
 * 3. Capture story outputs (world bible, episodes, beats, script)
 * 4. Evaluate using DeepEval metrics
 * 5. Generate recommendations
 */

// ============================================
// Hypothesis Definition
// ============================================

export type HypothesisVariableType = 'prompt' | 'model_param' | 'flow' | 'logic'

export interface HypothesisVariable {
  /** Type of variable being tested */
  type: HypothesisVariableType
  /** Baseline value (control) */
  baseline: string | Record<string, unknown>
  /** Variant value (treatment) */
  variant: string | Record<string, unknown>
}

export interface Hypothesis {
  /** Unique identifier for the hypothesis */
  id: string
  /** Human-readable name */
  name: string
  /** Detailed description of what we're testing */
  description: string
  /** The variable being tested */
  variable: HypothesisVariable
  /** Expected outcome/prediction */
  prediction: string
  /** Metrics to focus on for this hypothesis */
  targetMetrics: string[]
}

// ============================================
// Conversation Flow
// ============================================

export interface ConversationTurn {
  /** Role of the message sender */
  role: 'user' | 'assistant' | 'system'
  /** Message content */
  content: string
  /** Optional: expected tool calls for this turn */
  expectedToolCalls?: string[]
  /** Optional: phase this turn should be in */
  phase?: 'premise' | 'breaking' | 'writing' | 'complete'
}

export type OutputScope = 'worldBible' | 'episodes' | 'beats' | 'script'

export interface ExperimentPlan {
  /** The hypothesis being tested */
  hypothesis: Hypothesis
  /** Sequence of conversation turns to execute */
  messageFlow: ConversationTurn[]
  /** Which outputs to capture and evaluate */
  outputScope: OutputScope[]
  /** Number of iterations for statistical significance */
  iterations?: number
  /** Optional: specific metrics to run (defaults to all) */
  metrics?: string[]
}

// ============================================
// Captured Outputs
// ============================================

export interface CapturedWorldBible {
  masterPrompt?: string
  worldRules?: Array<{
    category: string
    rule: string
    consequence: string
  }>
  factions?: Array<{
    name: string
    description: string
    ideology?: string
    goals?: string[]
    resources?: string[]
    weaknesses?: string[]
    rivals?: string[]
  }>
  inspirations?: {
    books?: string[]
    movies?: string[]
    games?: string[]
  }
  soundtracks?: Array<{
    title: string
    artist?: string
    url?: string
  }>
  episodePremise?: {
    logline?: string
    protagonistHook?: string
    fatalFlaw?: string
    stakes?: string
  }
  cast?: Array<{
    name: string
    role: string
    description?: string
    motivation?: string
    archetype?: string
  }>
  worldDescription?: string
  plotTwists?: Array<{
    title: string
    description: string
    impact?: string
    foreshadowing?: string
  }>
}

export interface CapturedEpisode {
  id: string
  title?: string
  premise?: string
  scriptContent?: string
  storyPlan?: unknown
  currentPhase?: string
  status?: string
}

export interface CapturedBeat {
  id: string
  sequence: number
  logline: string
  beatType: 'setup' | 'complication' | 'revelation' | 'decision' | 'consequence'
  content?: string
  visualHook?: string
  charactersInvolved?: string[]
  emotionalShifts?: Record<string, { from: string; to: string }>
  causalDependencies?: string[]
  status?: string
}

export interface CapturedCharacter {
  id: string
  name: string
  role: string
  description?: string
  psychology?: {
    goals?: string[]
    fears?: string[]
    delusions?: string[]
  }
}

export interface CapturedOutputs {
  worldBible?: CapturedWorldBible
  episodes?: CapturedEpisode[]
  beats?: CapturedBeat[]
  script?: string
  characters?: CapturedCharacter[]
}

// ============================================
// Tool Calls
// ============================================

export interface CapturedToolCall {
  name: string
  args: Record<string, unknown>
  result?: unknown
  timestamp: number
}

// ============================================
// Executed Turn
// ============================================

export interface ExecutedTurn {
  /** Original turn from the plan */
  planned: ConversationTurn
  /** Actual response from the agent */
  response: string
  /** Tool calls made during this turn */
  toolCalls: CapturedToolCall[]
  /** Duration in milliseconds */
  durationMs: number
  /** Any errors encountered */
  error?: string
}

// ============================================
// Simulation Result
// ============================================

export interface SimulationResult {
  /** The hypothesis being tested */
  hypothesis: Hypothesis
  /** Version being tested ('baseline' or 'variant') */
  version: 'baseline' | 'variant'
  /** Executed conversation turns */
  turns: ExecutedTurn[]
  /** Captured story outputs */
  capturedOutputs: CapturedOutputs
  /** All tool calls across the simulation */
  rawToolCalls: CapturedToolCall[]
  /** Total simulation duration */
  durationMs: number
  /** Timestamp of simulation */
  timestamp: string
}

// ============================================
// Evaluation Results
// ============================================

export interface MetricResult {
  name: string
  score: number
  success: boolean
  reason: string
}

export interface TestCaseResult {
  input: string
  metrics: MetricResult[]
}

interface EvaluationResult {
  success: boolean
  testCases: TestCaseResult[]
  timestamp: string
  durationMs: number
}

// ============================================
// Metric Comparison (for A/B analysis)
// ============================================

export interface MetricComparison {
  metricName: string
  baselineScore: number
  variantScore: number
  delta: number
  deltaPercent: number
  improved: boolean
  significant: boolean
}

// ============================================
// Recommendation
// ============================================

export interface Recommendation {
  /** Priority: high, medium, low */
  priority: 'high' | 'medium' | 'low'
  /** Target area: prompt, logic, flow, model */
  area: 'prompt' | 'logic' | 'flow' | 'model'
  /** The recommendation */
  recommendation: string
  /** Supporting evidence */
  evidence: string
  /** Specific file/location to change (if applicable) */
  location?: string
}

// ============================================
// Final Report
// ============================================

export interface RecommendationReport {
  /** The hypothesis that was tested */
  hypothesis: Hypothesis
  /** Overall summary */
  summary: string
  /** Verdict: confirmed, rejected, inconclusive */
  verdict: 'confirmed' | 'rejected' | 'inconclusive'
  /** Metric-by-metric comparison */
  metricsAnalysis: MetricComparison[]
  /** Generated recommendations */
  recommendations: Recommendation[]
  /** Suggested next steps */
  nextSteps: string[]
  /** Raw data for further analysis */
  rawData: {
    baselineScores: Record<string, number>
    variantScores: Record<string, number>
    baselineSimulation: SimulationResult
    variantSimulation: SimulationResult
    statisticalSignificance?: number
  }
  /** Report generation timestamp */
  generatedAt: string
}

// ============================================
// DeepEval Input/Output (for Python bridge)
// ============================================

export interface DeepEvalTestCase {
  input: string
  actualOutput: string
  expectedOutput?: string
  context?: string[]
}

interface DeepEvalInput {
  hypothesis?: {
    id: string
    name: string
    variable: HypothesisVariable
  }
  testCases: DeepEvalTestCase[]
  metrics?: string[]
}

interface DeepEvalOutput {
  success: boolean
  testCases: TestCaseResult[]
  error?: string
}

// ============================================
// Experiment Configuration (JSON file format)
// ============================================

export interface ExperimentConfig extends ExperimentPlan {
  /** Optional: project ID to use for simulation */
  projectId?: string
  /** Optional: episode ID to use for simulation */
  episodeId?: string
  /** Optional: model to use */
  model?: string
  /** Optional: temperature for generation */
  temperature?: number
  /** Optional: top_p for generation */
  topP?: number
}
