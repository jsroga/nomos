/**
 * Parallel Storyteller Evaluation Runner
 *
 * Runs evaluations in parallel with configurable concurrency for 5-10 min runtime.
 * Features:
 * - 8-worker concurrent execution
 * - Mix of fast heuristic and slow LLM-as-judge evaluators
 * - Sampling strategy for expensive evaluators
 * - Real-time progress streaming
 * - Statistical aggregation with confidence intervals
 *
 * Usage:
 *   npm run eval:storyteller:fast   # Heuristics only
 *   npm run eval:storyteller:full   # Include LLM evaluators (sampled)
 */

import { Client, Run } from 'langsmith'
import pLimit from 'p-limit'
import { STORYTELLER_DATASET } from '../datasets/storyteller-golden'
import { ragGroundingEvaluator, ragGroundingHeuristic } from '../evaluators/rag-grounding'
import { consistencyEvaluator, consistencyHeuristic } from '../evaluators/consistency'
import { hallucinationDetector, hallucinationHeuristic } from '../evaluators/hallucination'
import { agentRoutingEvaluator, haltingBehaviorEvaluator } from '../evaluators/agent-routing'
import { scriptQualityEvaluator, scriptFormatEvaluator } from '../evaluators/script-quality'
import { magicScoreEvaluator, magicScoreHeuristic } from '../evaluators/magic-score'
import { CustomEvaluator, EvaluatorInput, EvaluationExample, ExperimentResult } from '../types'

// ============================================
// CONFIGURATION
// ============================================

export interface ParallelEvalConfig {
  maxConcurrency: number
  fastEvaluators: CustomEvaluator[]
  slowEvaluators: CustomEvaluator[]
  sampleRateForLLMEval: number // 0-1, sample rate for expensive LLM evaluators
  timeoutMs: number
  apiUrl: string
  projectId: string
  episodeId: string
}

const DEFAULT_CONFIG: ParallelEvalConfig = {
  maxConcurrency: 8,
  fastEvaluators: [
    ragGroundingHeuristic,
    consistencyHeuristic,
    hallucinationHeuristic,
    haltingBehaviorEvaluator,
    scriptFormatEvaluator,
    magicScoreHeuristic,
  ],
  slowEvaluators: [
    ragGroundingEvaluator,
    consistencyEvaluator,
    hallucinationDetector,
    agentRoutingEvaluator,
    scriptQualityEvaluator,
    magicScoreEvaluator,
  ],
  sampleRateForLLMEval: 0.3, // Only LLM-evaluate 30% of examples
  timeoutMs: 60000, // 1 minute per example
  apiUrl: process.env.API_URL || 'http://localhost:3000/api/storyteller/chat/stream',
  projectId: process.env.TEST_PROJECT_ID || '01c5deda-c654-4576-89f9-860ff545f2dd',
  episodeId: process.env.TEST_EPISODE_ID || 'f8722286-25b7-4d83-bd85-6cbac61be361',
}

// ============================================
// TYPES
// ============================================

interface EvalResult {
  exampleId: string
  input: Record<string, unknown>
  output: Record<string, unknown>
  scores: Record<string, number>
  reasoning: Record<string, string>
  metadata: Record<string, unknown>
  durationMs: number
  error?: string
}

interface AggregatedStats {
  mean: number
  stdDev: number
  min: number
  max: number
  p25: number
  p50: number
  p75: number
  count: number
}

interface ParallelExperimentResult extends ExperimentResult {
  stats: Record<string, AggregatedStats>
  executionTimeMs: number
  passRate: number
  failedExamples: string[]
}

// ============================================
// PROGRESS TRACKING
// ============================================

class ProgressTracker {
  private total: number
  private completed = 0
  private passed = 0
  private failed = 0
  private startTime = Date.now()

  constructor(total: number) {
    this.total = total
    console.log(`\n🚀 Starting parallel evaluation with ${total} examples\n`)
  }

  update(result: EvalResult) {
    this.completed++
    const avgScore =
      Object.values(result.scores).length > 0
        ? Object.values(result.scores).reduce((a, b) => a + b, 0) /
          Object.values(result.scores).length
        : 0

    if (avgScore >= 0.5 && !result.error) {
      this.passed++
    } else {
      this.failed++
    }

    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1)
    const pct = ((this.completed / this.total) * 100).toFixed(0)
    const icon = result.error ? '❌' : avgScore >= 0.5 ? '✅' : '⚠️'

    // Single-line progress update
    process.stdout.write(
      `\r${icon} [${this.completed}/${this.total}] ${pct}% | ✓${this.passed} ✗${this.failed} | ${elapsed}s | ${result.exampleId.slice(0, 20)}...   `
    )
  }

  finish() {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1)
    console.log(`\n\n✅ Completed ${this.completed}/${this.total} examples in ${elapsed}s`)
    console.log(`   Pass rate: ${((this.passed / this.total) * 100).toFixed(1)}%`)
  }
}

// ============================================
// API CALLER
// ============================================

async function callStorytellerAPI(
  input: Record<string, unknown>,
  config: ParallelEvalConfig
): Promise<Record<string, unknown>> {
  const message = input.message as string

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs)

  try {
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: message }],
        projectId: config.projectId,
        episodeId: config.episodeId,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    // Read stream response
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let fullResponse = ''

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullResponse += decoder.decode(value, { stream: true })
      }
    }

    // Parse delegated agents from response
    const delegatedAgents: string[] = []
    const agentPatterns = [
      /delegating to (\w+)/gi,
      /(\w+Architect)/gi,
      /(Writer|ScriptEditor|Showrunner)/gi,
    ]

    for (const pattern of agentPatterns) {
      let match
      while ((match = pattern.exec(fullResponse)) !== null) {
        if (match[1]) delegatedAgents.push(match[1])
      }
    }

    return {
      response: fullResponse,
      delegatedAgents: Array.from(new Set(delegatedAgents)),
      awaitingInput: /awaiting[_\s]*(user[_\s]*)?input/i.test(fullResponse),
    }
  } catch (error) {
    clearTimeout(timeout)
    return {
      response: '',
      error: error instanceof Error ? error.message : String(error),
      awaitingInput: false,
    }
  }
}

// ============================================
// EVALUATOR RUNNER
// ============================================

async function runEvaluators(
  evaluators: CustomEvaluator[],
  input: Record<string, unknown>,
  output: Record<string, unknown>,
  reference?: Record<string, unknown>
): Promise<{
  scores: Record<string, number>
  reasoning: Record<string, string>
  metadata: Record<string, unknown>
}> {
  const scores: Record<string, number> = {}
  const reasoning: Record<string, string> = {}
  const metadata: Record<string, unknown> = {}

  // Run evaluators in parallel (they're independent)
  const results = await Promise.allSettled(
    evaluators.map(async evaluator => {
      try {
        const evalInput: EvaluatorInput = { input, output, reference }
        const result = await evaluator.evaluate(evalInput)
        return { name: evaluator.name, result }
      } catch (error) {
        return {
          name: evaluator.name,
          result: {
            score: 0,
            reasoning: `Error: ${error instanceof Error ? error.message : String(error)}`,
            metadata: { error: true },
          },
        }
      }
    })
  )

  for (const settled of results) {
    if (settled.status === 'fulfilled') {
      const { name, result } = settled.value
      scores[name] = result.score
      reasoning[name] = result.reasoning
      if (result.metadata) {
        metadata[name] = result.metadata
      }
    }
  }

  return { scores, reasoning, metadata }
}

// ============================================
// STATISTICAL HELPERS
// ============================================

function calculateStats(values: number[]): AggregatedStats {
  if (values.length === 0) {
    return { mean: 0, stdDev: 0, min: 0, max: 0, p25: 0, p50: 0, p75: 0, count: 0 }
  }

  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length

  const mean = values.reduce((a, b) => a + b, 0) / n
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n
  const stdDev = Math.sqrt(variance)

  const percentile = (p: number) => {
    const idx = (p / 100) * (n - 1)
    const lower = Math.floor(idx)
    const upper = Math.ceil(idx)
    if (lower === upper) return sorted[lower]
    return sorted[lower] * (upper - idx) + sorted[upper] * (idx - lower)
  }

  return {
    mean,
    stdDev,
    min: sorted[0],
    max: sorted[n - 1],
    p25: percentile(25),
    p50: percentile(50),
    p75: percentile(75),
    count: n,
  }
}

function shouldSampleForLLM(index: number, total: number, sampleRate: number): boolean {
  // Deterministic sampling based on index for reproducibility
  // Sample evenly across the dataset
  const sampleEvery = Math.floor(1 / sampleRate)
  return index % sampleEvery === 0
}

// ============================================
// MAIN PARALLEL RUNNER
// ============================================

export async function runParallelEvaluation(
  examples: EvaluationExample[],
  config: Partial<ParallelEvalConfig> = {}
): Promise<ParallelExperimentResult> {
  const fullConfig: ParallelEvalConfig = { ...DEFAULT_CONFIG, ...config }
  const startTime = Date.now()

  console.log('============================================')
  console.log('🔄 Parallel Storyteller Evaluation')
  console.log('============================================')
  console.log(`Examples: ${examples.length}`)
  console.log(`Concurrency: ${fullConfig.maxConcurrency}`)
  console.log(`Fast evaluators: ${fullConfig.fastEvaluators.length}`)
  console.log(`Slow evaluators: ${fullConfig.slowEvaluators.length}`)
  console.log(`LLM sample rate: ${(fullConfig.sampleRateForLLMEval * 100).toFixed(0)}%`)

  const limit = pLimit(fullConfig.maxConcurrency)
  const progress = new ProgressTracker(examples.length)
  const results: EvalResult[] = []

  // Process all examples in parallel with concurrency limit
  const tasks = examples.map((example, index) =>
    limit(async () => {
      const exampleStart = Date.now()

      // Call API
      const output = await callStorytellerAPI(example.input, fullConfig)

      // Determine which evaluators to run
      let evaluators = fullConfig.fastEvaluators
      if (shouldSampleForLLM(index, examples.length, fullConfig.sampleRateForLLMEval)) {
        evaluators = [...evaluators, ...fullConfig.slowEvaluators]
      }

      // Run evaluators
      const evalResults = await runEvaluators(evaluators, example.input, output, example.expected)

      const result: EvalResult = {
        exampleId: example.id,
        input: example.input,
        output,
        scores: evalResults.scores,
        reasoning: evalResults.reasoning,
        metadata: evalResults.metadata,
        durationMs: Date.now() - exampleStart,
        error: output.error as string | undefined,
      }

      results.push(result)
      progress.update(result)

      return result
    })
  )

  // Wait for all tasks to complete
  await Promise.all(tasks)
  progress.finish()

  // Aggregate results
  const aggregatedScores: Record<string, number> = {}
  const stats: Record<string, AggregatedStats> = {}

  // Get all evaluator names
  const allEvaluatorNames = new Set<string>()
  for (const result of results) {
    for (const name of Object.keys(result.scores)) {
      allEvaluatorNames.add(name)
    }
  }

  // Calculate stats for each evaluator
  for (const name of allEvaluatorNames) {
    const scores = results.filter(r => r.scores[name] !== undefined).map(r => r.scores[name])

    if (scores.length > 0) {
      stats[name] = calculateStats(scores)
      aggregatedScores[name] = stats[name].mean
    }
  }

  // Calculate overall pass rate
  const passThreshold = 0.5
  const passedResults = results.filter(r => {
    const avg =
      Object.values(r.scores).length > 0
        ? Object.values(r.scores).reduce((a, b) => a + b, 0) / Object.values(r.scores).length
        : 0
    return avg >= passThreshold && !r.error
  })

  const failedExamples = results
    .filter(r => {
      const avg =
        Object.values(r.scores).length > 0
          ? Object.values(r.scores).reduce((a, b) => a + b, 0) / Object.values(r.scores).length
          : 0
      return avg < passThreshold || r.error
    })
    .map(r => r.exampleId)

  const executionTimeMs = Date.now() - startTime

  // Print summary
  printSummary(stats, passedResults.length, results.length, executionTimeMs, failedExamples)

  return {
    experimentId: `parallel-${Date.now()}`,
    datasetName: 'storyteller-golden',
    results: results.map(r => ({
      exampleId: r.exampleId,
      scores: r.scores,
      reasoning: r.reasoning,
    })),
    aggregatedScores,
    timestamp: new Date(),
    stats,
    executionTimeMs,
    passRate: passedResults.length / results.length,
    failedExamples,
  }
}

function printSummary(
  stats: Record<string, AggregatedStats>,
  passed: number,
  total: number,
  executionTimeMs: number,
  failedExamples: string[]
) {
  console.log('\n============================================')
  console.log('📊 Evaluation Summary')
  console.log('============================================')
  console.log(`Execution time: ${(executionTimeMs / 1000).toFixed(1)}s`)
  console.log(`Pass rate: ${passed}/${total} (${((passed / total) * 100).toFixed(1)}%)`)
  console.log('')

  console.log('Scores by Evaluator:')
  console.log('─────────────────────────────────────────────')

  for (const [name, s] of Object.entries(stats)) {
    const bar = '█'.repeat(Math.round(s.mean * 20)) + '░'.repeat(20 - Math.round(s.mean * 20))
    console.log(`  ${name}:`)
    console.log(`    ${bar} ${(s.mean * 100).toFixed(1)}%`)
    console.log(
      `    μ=${(s.mean * 100).toFixed(1)}% σ=${(s.stdDev * 100).toFixed(1)}% [${(s.min * 100).toFixed(0)}-${(s.max * 100).toFixed(0)}%] n=${s.count}`
    )
  }

  if (failedExamples.length > 0) {
    console.log('\n❌ Failed Examples:')
    for (const id of failedExamples.slice(0, 5)) {
      console.log(`   - ${id}`)
    }
    if (failedExamples.length > 5) {
      console.log(`   ... and ${failedExamples.length - 5} more`)
    }
  }
}

// ============================================
// CLI ENTRY POINT
// ============================================

async function main() {
  const args = process.argv.slice(2)
  const mode = args.includes('--full') ? 'full' : 'fast'

  console.log(`\n📋 Mode: ${mode.toUpperCase()}`)

  const config: Partial<ParallelEvalConfig> = {
    sampleRateForLLMEval: mode === 'full' ? 0.3 : 0, // 0 = no LLM evaluators
    maxConcurrency: mode === 'full' ? 4 : 8, // Lower concurrency for LLM calls
  }

  if (mode === 'fast') {
    // Fast mode: only heuristic evaluators
    config.slowEvaluators = []
  }

  try {
    const result = await runParallelEvaluation(STORYTELLER_DATASET.examples, config)

    // Save results to file
    const resultsPath = `./eval-results-${Date.now()}.json`
    const fs = await import('fs/promises')
    await fs.writeFile(resultsPath, JSON.stringify(result, null, 2))
    console.log(`\n💾 Results saved to: ${resultsPath}`)

    // Exit with error code if pass rate is too low
    if (result.passRate < 0.5) {
      console.log('\n⚠️  Pass rate below threshold (50%)')
      process.exit(1)
    }

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Evaluation failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
