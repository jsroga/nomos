/**
 * Storyteller Evaluation Experiment Runner
 *
 * Provides infrastructure for:
 * - Running A/B tests on prompt variations
 * - Tracking metric trends over time
 * - Automatic regression detection
 * - Golden set comparison
 *
 * Integrates with LangSmith for experiment tracking and visualization.
 */

// Load environment variables from .env.local (must be before other imports that use env vars)
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

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

import { Client } from 'langsmith'
import { magicScoreEvaluator } from '../evaluators/magic-score'
import { consistencyEvaluator } from '../evaluators/consistency'
import { combinedHallucinationEvaluator } from '../evaluators/hallucination'
import { narrativeCoherenceEvaluator } from '../evaluators/narrative-coherence'
import { STORYTELLER_GOLDEN_DATASET } from '../datasets/storyteller-golden'
import type { CustomEvaluator } from '../types'

// ============================================
// CONFIGURATION
// ============================================

// Default evaluator configurations (LLM-only, no heuristics)
const EVALUATOR_CONFIGS = {
  full: [
    magicScoreEvaluator,
    consistencyEvaluator,
    combinedHallucinationEvaluator,
    narrativeCoherenceEvaluator,
  ],
  magicOnly: [magicScoreEvaluator],
  consistencyOnly: [consistencyEvaluator],
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

function getLangSmithClient(): Client | null {
  if (!process.env.LANGCHAIN_API_KEY) {
    console.warn('LANGCHAIN_API_KEY not set - LangSmith integration disabled')
    return null
  }
  return new Client()
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
  const startTime = Date.now()
  const client = getLangSmithClient()

  // Select evaluators
  const evaluators =
    options.customEvaluators ||
    EVALUATOR_CONFIGS[options.evaluatorSet || 'full']

  // Get dataset (optionally sample)
  let examples = STORYTELLER_GOLDEN_DATASET.examples
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
          // Generate output
          const output = await generateOutput(example.input)

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

          return {
            exampleId: example.id,
            input: example.input,
            output,
            scores,
            reasoning,
            metadata,
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

  // Log to LangSmith
  if (client) {
    await logExperimentToLangSmith(client, experimentRun)
  }

  // Print summary
  printExperimentSummary(experimentRun)

  return experimentRun
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
): Promise<{ variantA: ExperimentRun; variantB: ExperimentRun; winner: string; significance: number }> {
  console.log(`\n🔬 Starting A/B Test: ${name}`)
  console.log(`   Variant A: ${variantA.name}`)
  console.log(`   Variant B: ${variantB.name}`)

  // Run both variants
  const [resultA, resultB] = await Promise.all([
    runStorytellerExperiment(
      { ...options, name: `${name} - ${variantA.name}`, tags: [...(options.tags || []), 'ab-test', 'variant-a'] },
      variantA.generate
    ),
    runStorytellerExperiment(
      { ...options, name: `${name} - ${variantB.name}`, tags: [...(options.tags || []), 'ab-test', 'variant-b'] },
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
// REGRESSION DETECTION
// ============================================

async function detectRegressions(
  currentScores: Record<string, number>,
  _previousExperimentId: string,
  _client: Client | null
): Promise<RegressionAlert[]> {
  // TODO: In a real implementation, fetch previous experiment from LangSmith
  // For now, just check against thresholds
  return detectThresholdViolations(currentScores)
}

function detectThresholdViolations(scores: Record<string, number>): RegressionAlert[] {
  const alerts: RegressionAlert[] = []

  // Check magic score
  if (scores['magic-score'] !== undefined && scores['magic-score'] < QUALITY_THRESHOLDS.magicScore / 100) {
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
  if (scores['consistency'] !== undefined && scores['consistency'] < QUALITY_THRESHOLDS.consistency) {
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
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `exp_${timestamp}_${random}`
}

function sampleArray<T>(array: T[], size: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, size)
}

async function logExperimentToLangSmith(client: Client, experiment: ExperimentRun): Promise<void> {
  try {
    // Log each result as a run (use 'chain' type for evaluation runs)
    for (const result of experiment.results) {
      await client.createRun({
        name: `${experiment.name}/${result.exampleId}`,
        run_type: 'chain',
        inputs: result.input as Record<string, unknown>,
        outputs: { output: result.output, scores: result.scores },
        extra: {
          metadata: result.metadata,
          reasoning: result.reasoning,
          experimentId: experiment.id,
          runCategory: 'evaluation', // Track this is an evaluation run
        },
      })
    }

    console.log(`   📤 Logged ${experiment.results.length} results to LangSmith`)
  } catch (error) {
    console.error('Failed to log to LangSmith:', error)
  }
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
  const experimentName = args.find(a => a.startsWith('--experiment='))?.split('=')[1] || 'default-test'
  const evaluatorSet = args.find(a => a.startsWith('--evaluators='))?.split('=')[1] || 'fast'
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
