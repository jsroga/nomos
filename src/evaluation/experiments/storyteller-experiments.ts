/**
 * Storyteller Evaluation Experiment Runner
 *
 * Provides infrastructure for:
 * - Running A/B tests on prompt variations
 * - Tracking metric trends over time
 * - Automatic regression detection
 * - Golden set comparison
 */

// Load environment variables from .env.local (must be before other imports that use env vars)
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { registerCorePrompts } from '../../prompts/registry'

// Load .env.local file, handling both standard and shell export formats
function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8')
    // Handle shell export format: "export KEY=value"
    content.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        // Remove 'export ' prefix if present
        const cleanLine = trimmed.replace(/^export\s+/, '')
        const [key, ...valueParts] = cleanLine.split('=')
        if (key && valueParts.length > 0) {
          let value = valueParts.join('=')
          // Remove surrounding quotes if present
          value = value.replace(/^["']|["']$/g, '')
          process.env[key] = value
        }
      }
    })
    console.log('📂 Loaded environment from .env.local')
  } else {
    // Fall back to standard dotenv
    dotenv.config()
  }
}

loadEnvFile()

// Force disable LangSmith tracing (overrides .env.local)
process.env.LANGCHAIN_TRACING_V2 = 'false'
process.env.LANGSMITH_TRACING = 'false'
process.env.LANGCHAIN_TRACED_BY = ''

import { MagicJudge } from '../judges/creative/magic-judge'
import { ConsistencyJudge } from '../judges/consistency-judge'
import { HallucinationJudge } from '../judges/rag/hallucination-judge'
import { CoherenceJudge } from '../judges/coherence-judge'
import { ReverseIntentJudge } from '../judges/creative/advanced-judges'
import { OrchestrationJudge } from '../judges/operational/orchestration-judge'
import { STORYTELLER_GOLDEN_DATASET } from '../datasets/storyteller-golden'
import { ALL_SCENARIOS } from '../datasets/scenarios'
import type {
  CustomEvaluator,
  MultiVariantReport,
  VariantReport,
  ScenarioMetrics,
  EvaluationExample,
  EvaluatorInput,
  EvaluatorResult,
} from '../types'
import { saveHtmlReport } from '../report-generator'
import { BaseJudge } from '../judges/base-judge'

// Adapter to bridge BaseJudge (3 args) to CustomEvaluator (1 arg object)
class JudgeAdapter implements CustomEvaluator {
  constructor(private judge: BaseJudge) {}

  get name() {
    return this.judge.name
  }

  async evaluate(params: EvaluatorInput): Promise<EvaluatorResult> {
    const result = await this.judge.evaluate(params.input, params.output, params.reference)
    return {
      score: result.score,
      reasoning: result.reason,
      metadata: {
        ...result.metadata,
        scoreName: result.scoreName,
      },
    }
  }
}

// ============================================
// CONFIGURATION
// ============================================

// Default evaluator configurations (LLM-only, no heuristics)
const EVALUATOR_CONFIGS = {
  full: [
    new JudgeAdapter(new OrchestrationJudge()),
    new JudgeAdapter(new MagicJudge()),
    new JudgeAdapter(new ConsistencyJudge()),
    new JudgeAdapter(new HallucinationJudge()),
    new JudgeAdapter(new CoherenceJudge()),
    new JudgeAdapter(new ReverseIntentJudge()),
  ],
  magicOnly: [new JudgeAdapter(new MagicJudge())],
  pro: [
    new JudgeAdapter(new OrchestrationJudge()),
    new JudgeAdapter(new MagicJudge()),
    new JudgeAdapter(new ReverseIntentJudge()),
    new JudgeAdapter(new CoherenceJudge()),
  ],
  consistencyOnly: [new JudgeAdapter(new ConsistencyJudge())],
} as const

// Quality thresholds for regression detection
const QUALITY_THRESHOLDS = {
  magicScore: 60, // Minimum acceptable magic score
  consistency: 0.8, // 80% consistency score
  hallucination: 0.9, // 90% hallucination-free
  narrativeCoherence: 0.6, // 60% narrative coherence
  overall: 0.65, // Combined threshold
} as const

// ============================================
// TYPES
// ============================================

interface ExperimentOptions {
  name: string
  description?: string
  evaluatorSet?: keyof typeof EVALUATOR_CONFIGS
  customEvaluators?: CustomEvaluator[]
  sampleSize?: number
  parallelism?: number
  compareWith?: string // Previous experiment ID for comparison
  tags?: string[]
  examples?: EvaluationExample[] // Specific dataset to run
}

interface ExperimentRun {
  id: string
  name: string
  timestamp: Date
  config: ExperimentOptions
  results: ExampleResult[]
  aggregatedScores: Record<string, number>
  regressions: RegressionAlert[]
  duration: number
}

interface ExampleResult {
  exampleId: string
  input: Record<string, unknown>
  output: unknown
  scores: Record<string, number>
  reasoning: Record<string, string>
  metadata: Record<string, unknown>
  context?: Record<string, unknown>
}

interface RegressionAlert {
  metric: string
  previousValue: number
  currentValue: number
  delta: number
  severity: 'warning' | 'critical'
  message: string
}

// ============================================
// LANGSMITH CLIENT
// ============================================

function getLangSmithClient(): null {
  return null
}

// ============================================
// EXPERIMENT RUNNER
// ============================================

/**
 * Run a storyteller evaluation experiment
 */
export async function runStorytellerExperiment(
  options: ExperimentOptions,
  generateOutput: (input: Record<string, unknown>) => Promise<unknown>
): Promise<ExperimentRun> {
  // Ensure prompts are registered
  registerCorePrompts()

  const startTime = Date.now()
  const client = getLangSmithClient()

  // Select evaluators
  const evaluators = options.customEvaluators || EVALUATOR_CONFIGS[options.evaluatorSet || 'full']

  // Get dataset (optionally sample)
  let examples = options.examples || STORYTELLER_GOLDEN_DATASET.examples
  if (options.sampleSize && options.sampleSize < examples.length) {
    examples = sampleArray(examples, options.sampleSize)
  }

  console.log(`\n🧪 Starting experiment: ${options.name}`)
  console.log(`   Examples: ${examples.length}`)
  console.log(`   Evaluators: ${evaluators.map(e => e.name).join(', ')}`)

  // Run evaluations
  const results: ExampleResult[] = []
  const parallelism = options.parallelism || 3

  for (let i = 0; i < examples.length; i += parallelism) {
    const batch = examples.slice(i, i + parallelism)
    const batchResults = await Promise.all(
      batch.map(async example => {
        try {
          // Generate output with Latency Tracking
          const genStart = Date.now()
          const outputResult = await generateOutput(example.input)
          const genDuration = Date.now() - genStart

          let output: unknown = outputResult
          let context: Record<string, unknown> | undefined = undefined

          // Extract context if output matches { response, context } structure
          if (outputResult && typeof outputResult === 'object' && 'context' in outputResult) {
            context = (outputResult as any).context
            // If response is present, evaluate that. Otherwise eval the whole object.
            if ('response' in outputResult) {
              output = (outputResult as any).response
            }
          }

          // Run all evaluators
          const evalResults = await Promise.all(
            evaluators.map(async evaluator => {
              const result = await evaluator.evaluate({
                input: example.input as Record<string, unknown>,
                output: output as Record<string, unknown>,
                reference: example.expected as Record<string, unknown>,
              })
              return { name: evaluator.name, ...result }
            })
          )

          // Aggregate results
          const scores: Record<string, number> = {}
          const reasoning: Record<string, string> = {}
          const metadata: Record<string, unknown> = {}

          for (const result of evalResults) {
            scores[result.name] = result.score
            reasoning[result.name] = result.reasoning
            metadata[result.name] = result.metadata
          }

          // Calculate approximate cost (Haiku pricing: $0.25/M input, $1.25/M output)
          // Rough estimation: 1 token ~= 4 chars
          const inputStr = JSON.stringify(example.input)
          const outputStr = JSON.stringify(output)
          const inputTokens = inputStr.length / 4
          const outputTokens = outputStr.length / 4
          const costUsd = (inputTokens / 1_000_000) * 0.25 + (outputTokens / 1_000_000) * 1.25

          // Merge example metadata (e.g. scenario name)
          Object.assign(metadata, example.metadata, {
            latencyMs: genDuration,
            costUsd: costUsd,
            tokens: inputTokens + outputTokens,
          })

          return {
            exampleId: example.id,
            input: example.input,
            output,
            scores,
            reasoning,
            metadata,
            context,
          }
        } catch (error) {
          console.error(`Error evaluating example ${example.id}:`, error)
          return {
            exampleId: example.id,
            input: example.input,
            output: null,
            scores: {},
            reasoning: { error: String(error) },
            metadata: { error: true },
            context: {},
          }
        }
      })
    )

    results.push(...batchResults)
    console.log(`   Progress: ${Math.min(i + parallelism, examples.length)}/${examples.length}`)
  }

  // Calculate aggregated scores
  const aggregatedScores = calculateAggregatedScores(results)

  // Detect regressions
  let regressions: RegressionAlert[] = []
  if (options.compareWith) {
    regressions = await detectRegressions(aggregatedScores, options.compareWith, client)
  } else {
    regressions = detectThresholdViolations(aggregatedScores)
  }

  const duration = Date.now() - startTime

  const experimentRun: ExperimentRun = {
    id: generateExperimentId(),
    name: options.name,
    timestamp: new Date(),
    config: options,
    results,
    aggregatedScores,
    regressions,
    duration,
  }

  // Save results to JSON for automated reporting
  await saveExperimentResults(experimentRun)

  // Generate and save HTML report
  saveHtmlReport(experimentRun)

  // Print summary
  printExperimentSummary(experimentRun)

  return experimentRun
}

/**
 * Save experiment results to a JSON file
 */
async function saveExperimentResults(experiment: ExperimentRun): Promise<void> {
  const resultsDir = path.resolve(process.cwd(), 'src/evaluation/results')
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true })
  }

  const fileName = `${experiment.id}.json`
  const filePath = path.join(resultsDir, fileName)

  fs.writeFileSync(filePath, JSON.stringify(experiment, null, 2))
  console.log(`   💾 Results saved to: src/evaluation/results/${fileName}`)

  // Also maintain a 'latest.json' for easier automated reporting
  const latestPath = path.join(resultsDir, 'latest.json')
  fs.writeFileSync(latestPath, JSON.stringify(experiment, null, 2))
}

// ============================================
// A/B TESTING
// ============================================

/**
 * Run an A/B test comparing two prompt variations
 */
export async function runABTest(
  name: string,
  variantA: {
    name: string
    generate: (input: Record<string, unknown>) => Promise<unknown>
  },
  variantB: {
    name: string
    generate: (input: Record<string, unknown>) => Promise<unknown>
  },
  options: Omit<ExperimentOptions, 'name'> = {}
): Promise<{
  variantA: ExperimentRun
  variantB: ExperimentRun
  winner: string
  significance: number
}> {
  console.log(`\n🔬 Starting A/B Test: ${name}`)
  console.log(`   Variant A: ${variantA.name}`)
  console.log(`   Variant B: ${variantB.name}`)

  // Run both variants
  const [resultA, resultB] = await Promise.all([
    runStorytellerExperiment(
      {
        ...options,
        name: `${name} - ${variantA.name}`,
        tags: [...(options.tags || []), 'ab-test', 'variant-a'],
      },
      variantA.generate
    ),
    runStorytellerExperiment(
      {
        ...options,
        name: `${name} - ${variantB.name}`,
        tags: [...(options.tags || []), 'ab-test', 'variant-b'],
      },
      variantB.generate
    ),
  ])

  // Compare results
  const metricsToCompare = Object.keys(resultA.aggregatedScores)
  let aWins = 0
  let bWins = 0

  for (const metric of metricsToCompare) {
    if (resultA.aggregatedScores[metric] > resultB.aggregatedScores[metric]) {
      aWins++
    } else if (resultB.aggregatedScores[metric] > resultA.aggregatedScores[metric]) {
      bWins++
    }
  }

  const winner = aWins > bWins ? variantA.name : variantB.name
  const significance = Math.abs(aWins - bWins) / metricsToCompare.length

  console.log('\n📊 A/B Test Results:')
  console.log(`   Winner: ${winner}`)
  console.log(`   Significance: ${(significance * 100).toFixed(1)}%`)

  return { variantA: resultA, variantB: resultB, winner, significance }
}

// ============================================
// MULTI-VARIANT TESTING (MAGICAL FORMULA)
// ============================================

export interface AgentVariant {
  name: string
  config: Record<string, unknown>
  generate: (input: Record<string, unknown>) => Promise<unknown>
}

// removed duplicate import

export async function runMultiVariantTest(
  name: string,
  variants: AgentVariant[],
  options?: {
    examples?: EvaluationExample[]
    customEvaluators?: CustomEvaluator[]
  }
): Promise<MultiVariantReport> {
  console.log(`\n🧪 Starting Multi-Variant Test: ${name}`)
  console.log(`   Variants: ${variants.map(v => v.name).join(', ')}`)

  const reports: VariantReport[] = []
  let scenarioMap: Record<string, EvaluationExample[]> = {}

  if (options?.examples && options.examples.length > 0) {
    console.log(`   Using Custom Examples: ${options.examples.length}`)
    // Group provided examples by scenario, or default to 'Custom'
    for (const ex of options.examples) {
      const key = (ex.metadata?.scenario as string) || 'Custom'
      if (!scenarioMap[key]) scenarioMap[key] = []
      scenarioMap[key].push(ex)
    }
  } else {
    // ... existing logic ...
    console.log('   Scenarios: Sci-Fi, Fantasy, Thriller, Edge Cases')
    // Map helpful scenario names to filtered subsets of ALL_SCENARIOS
    // We filter ALL_SCENARIOS which should be imported
    scenarioMap = {
      'Sci-Fi': ALL_SCENARIOS.filter(e => e.metadata?.scenario === 'sci-fi'),
      Fantasy: ALL_SCENARIOS.filter(e => e.metadata?.scenario === 'fantasy'),
      Thriller: ALL_SCENARIOS.filter(e => e.metadata?.scenario === 'thriller'),
      Edge: ALL_SCENARIOS.filter(e => e.metadata?.scenario === 'edge'),
    }
  }

  const scenarioNames = Object.keys(scenarioMap)

  for (const variant of variants) {
    console.log(`\n👉 Running Variant: ${variant.name}`)
    const scenarioMetrics: Record<string, ScenarioMetrics> = {}
    const allResults: ExampleResult[] = []

    for (const [scenarioName, examples] of Object.entries(scenarioMap)) {
      // Skip if no examples
      if (examples.length === 0) continue

      const run = await runStorytellerExperiment(
        {
          name: `${name}-${variant.name}-${scenarioName}`,
          evaluatorSet: 'pro', // Default, but overridden if customEvaluators provided
          customEvaluators: options?.customEvaluators, // Pass custom evaluators down
          examples: examples,
          tags: ['multi-variant', variant.name, scenarioName],
        },
        variant.generate
      )
      // ...

      // Aggregate metrics for this scenario
      scenarioMetrics[scenarioName.toLowerCase()] = {
        magicScore: run.aggregatedScores['magic-score'] || 0,
        consistency: run.aggregatedScores['consistency'] || 0,
        orchestration: run.aggregatedScores['orchestration'] || 0,
        latencyMs: run.duration / run.results.length,
        costUsd: 0, // Placeholder
      }
      allResults.push(...run.results)
    }

    // Calculate Overall
    const overallAgg = calculateAggregatedScores(allResults)
    const overallMetrics: ScenarioMetrics = {
      magicScore: overallAgg['magic-score'] || 0,
      consistency: overallAgg['consistency'] || 0,
      orchestration: overallAgg['orchestration'] || 0,
      latencyMs: 0,
      costUsd: 0,
    }

    // Map logs for Detail View
    const exampleLogs = allResults.map(r => ({
      id: r.exampleId,
      scenario: (r.metadata['scenario'] as string) || 'unknown',
      input: (r.input['message'] as string) || JSON.stringify(r.input),
      output: (r.output as any)?.response || JSON.stringify(r.output),
      score: r.scores['magic-score'] || 0,
      reasoning: r.reasoning,
      context: r.context,
    }))

    reports.push({
      name: variant.name,
      config: variant.config,
      overallMetrics,
      scenarioMetrics,
      exampleLogs,
    })

    // Save incrementally so dashboard updates live
    const currentReport: MultiVariantReport = {
      id: generateExperimentId(),
      timestamp: new Date().toISOString(),
      variants: reports,
      scenarios: scenarioNames.map(s => s.toLowerCase()),
    }

    const resultsDir = path.resolve(process.cwd(), 'src/evaluation/results')
    if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true })
    fs.writeFileSync(path.join(resultsDir, 'latest.json'), JSON.stringify(currentReport, null, 2))
    console.log(`   💾 Intermediate Report saved for Variant: ${variant.name}`)
  }

  // Final save (redundant but safe)
  const report: MultiVariantReport = {
    id: generateExperimentId(),
    timestamp: new Date().toISOString(),
    variants: reports,
    scenarios: scenarioNames.map(s => s.toLowerCase()),
  }

  console.log('\n💾 Multi-Variant Report saved to: src/evaluation/results/latest.json')

  return report
}

// ============================================
// REGRESSION DETECTION
// ============================================

async function detectRegressions(
  currentScores: Record<string, number>,
  _previousExperimentId: string,
  _client: null
): Promise<RegressionAlert[]> {
  // For now, just check against thresholds
  return detectThresholdViolations(currentScores)
}

function detectThresholdViolations(scores: Record<string, number>): RegressionAlert[] {
  const alerts: RegressionAlert[] = []

  // Check magic score
  if (
    scores['magic-score'] !== undefined &&
    scores['magic-score'] < QUALITY_THRESHOLDS.magicScore / 100
  ) {
    alerts.push({
      metric: 'magic-score',
      previousValue: QUALITY_THRESHOLDS.magicScore / 100,
      currentValue: scores['magic-score'],
      delta: scores['magic-score'] - QUALITY_THRESHOLDS.magicScore / 100,
      severity: scores['magic-score'] < 0.4 ? 'critical' : 'warning',
      message: `Magic score (${(scores['magic-score'] * 100).toFixed(0)}) below threshold (${QUALITY_THRESHOLDS.magicScore})`,
    })
  }

  // Check consistency
  if (
    scores['consistency'] !== undefined &&
    scores['consistency'] < QUALITY_THRESHOLDS.consistency
  ) {
    alerts.push({
      metric: 'consistency',
      previousValue: QUALITY_THRESHOLDS.consistency,
      currentValue: scores['consistency'],
      delta: scores['consistency'] - QUALITY_THRESHOLDS.consistency,
      severity: scores['consistency'] < 0.6 ? 'critical' : 'warning',
      message: `Consistency (${(scores['consistency'] * 100).toFixed(0)}%) below threshold (${QUALITY_THRESHOLDS.consistency * 100}%)`,
    })
  }

  return alerts
}

// ============================================
// HELPERS
// ============================================

function calculateAggregatedScores(results: ExampleResult[]): Record<string, number> {
  const allScores: Record<string, number[]> = {}

  for (const result of results) {
    for (const [metric, score] of Object.entries(result.scores)) {
      if (!allScores[metric]) {
        allScores[metric] = []
      }
      allScores[metric].push(score)
    }
  }

  const aggregated: Record<string, number> = {}
  for (const [metric, scores] of Object.entries(allScores)) {
    aggregated[metric] = scores.reduce((a, b) => a + b, 0) / scores.length
  }

  return aggregated
}

function generateExperimentId(): string {
  const now = new Date()
  const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0]
  const random = Math.random().toString(36).substring(2, 6)
  return `eval_${timestamp}_${random}`
}

function sampleArray<T>(array: T[], size: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, size)
}

function printExperimentSummary(experiment: ExperimentRun): void {
  console.log(`\n📊 Experiment Summary: ${experiment.name}`)
  console.log(`   ID: ${experiment.id}`)
  console.log(`   Duration: ${(experiment.duration / 1000).toFixed(1)}s`)
  console.log(`   Examples evaluated: ${experiment.results.length}`)

  console.log('\n   Aggregated Scores:')
  for (const [metric, score] of Object.entries(experiment.aggregatedScores)) {
    const percentage = (score * 100).toFixed(1)
    const bar = '█'.repeat(Math.round(score * 20)) + '░'.repeat(20 - Math.round(score * 20))
    console.log(`   ${metric.padEnd(25)} ${bar} ${percentage}%`)
  }

  if (experiment.regressions.length > 0) {
    console.log('\n   ⚠️  Regressions Detected:')
    for (const alert of experiment.regressions) {
      const icon = alert.severity === 'critical' ? '🔴' : '🟡'
      console.log(`   ${icon} ${alert.message}`)
    }
  } else {
    console.log('\n   ✅ No regressions detected')
  }
}

// ============================================
// CLI RUNNER
// ============================================

/**
 * Run experiments from command line
 * Usage: npx ts-node src/evaluation/experiments/storyteller-experiments.ts --experiment "my-test"
 */
async function main() {
  const args = process.argv.slice(2)
  const experimentName =
    args.find(a => a.startsWith('--experiment='))?.split('=')[1] || 'default-test'
  const evaluatorSet = args.find(a => a.startsWith('--evaluators='))?.split('=')[1] || 'magicOnly'
  const sampleSize = parseInt(args.find(a => a.startsWith('--samples='))?.split('=')[1] || '10', 10)

  console.log('🧪 Storyteller Evaluation Experiment Runner')
  console.log('==========================================')

  // Mock output generator for testing
  const mockGenerator = async (input: Record<string, unknown>) => {
    const message = (input as { message?: string }).message || 'unknown'
    return {
      response: `This is a mock response for: ${message}`,
      delegatedAgents: ['PlotArchitect'],
    }
  }

  await runStorytellerExperiment(
    {
      name: experimentName,
      evaluatorSet: evaluatorSet as keyof typeof EVALUATOR_CONFIGS,
      sampleSize,
      tags: ['cli-run'],
    },
    mockGenerator
  )
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error)
}

export { EVALUATOR_CONFIGS, QUALITY_THRESHOLDS }
