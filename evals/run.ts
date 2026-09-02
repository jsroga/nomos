/**
 * Mastra scorer evaluation runner
 *
 * Usage:
 *   npm run eval
 *   npm run eval -- --samples=5
 *   npm run eval -- --scorers=magic
 *
 * LLM scorers use JUDGING_MODEL from .env.local (default openai/gpt-5.6-sol).
 * Example: JUDGING_MODEL=openai/gpt-5.6-luna
 */

// First, and before every other import: `@/shared/config/env` parses
// `process.env` at import time, so .env.local has to be loaded before any
// module that reads it is evaluated.
import './env-preload'
import * as fs from 'fs'
import * as path from 'path'
import { inputRecord } from '@/shared/agent-kernel/scorers/shared'
import { getErrorMessage } from '@/shared/errors/error-utils'
// The .mjs module is shared with the pre-commit check, which runs under bare
// node; it carries no types by design.
import { inputHash } from './input-hash.mjs'
import { addJudgeUsage, judgeUsageOf, EMPTY_JUDGE_USAGE, type JudgeUsage } from './judge-usage'
import { examplesMatchingScorers } from './select-eval-examples'
import type {
  ExampleLog,
  MultiVariantReport,
  RunnableEvalExample,
  ScenarioMetrics,
  ScorerFailure,
  ScorerRunResult,
  VariantReport,
} from './types'

const DEFAULT_DATASET = 'storyteller'
const IDEA_DATASET = 'idea-diversity'
const DEFAULT_OUTPUT_FILE = 'latest.json'
const IDEA_OUTPUT_FILE = 'idea-diversity-latest.json'

function parseArgs(totalExamples: number) {
  const args = process.argv.slice(2)
  const samplesArg = args.find(a => a.startsWith('--samples='))?.split('=')[1]
  const samples = samplesArg ? parseInt(samplesArg, 10) : totalExamples
  const scorerFilter = args
    .find(a => a.startsWith('--scorers='))
    ?.split('=')[1]
    ?.split(',')
  return { samples, scorerFilter }
}

function parseDataset(): string {
  const arg = process.argv.slice(2).find(a => a.startsWith('--dataset='))?.split('=')[1]
  return arg ?? DEFAULT_DATASET
}

function sampleArray<T>(array: T[], size: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(size, array.length))
}

function generateRunId(): string {
  const now = new Date()
  const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0]
  const random = Math.random().toString(36).substring(2, 6)
  return `eval_${timestamp}_${random}`
}

function scorersForExample(example: RunnableEvalExample, selected: readonly RunnableScorer[]) {
  const allowed = example.metadata.scorers
  if (!allowed?.length) return [...selected]
  return selected.filter(s => allowed.some(id => id === s.id))
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Averages over the results that *have* the scorer, not over every result with
 * a missing one read as 0 — a scorer scoped to three examples used to be
 * divided by the whole run.
 */
function buildScenarioMetrics(results: ScorerRunResult[]): ScenarioMetrics {
  const collect = (key: string) =>
    results.filter(r => key in r.scores).map(r => r.scores[key])
  return {
    magicScore: average(collect('magic')),
    consistency: average(collect('consistency')),
    hallucination: average(collect('hallucination')),
    personaFidelity: average(collect('persona-fidelity')),
    latencyMs: average(results.map(r => Number(r.metadata?.latencyMs ?? 0))),
  }
}

async function loadScorers() {
  const { ALL_SCORERS, IDEA_DIVERSITY_SCORERS } = await import('@/shared/agent-kernel/scorers')
  // Deterministic domain scorers (beat-plan gate, critic discipline) live in
  // the storyteller domain — shared/ cannot import domains, so the union
  // happens here in the runner. Idea-diversity scorers ride along; the
  // per-example `scorers` filter scopes each to its dataset.
  const { STORYTELLER_EVAL_SCORERS } = await import('@/domains/storyteller/ai')
  return [...ALL_SCORERS, ...STORYTELLER_EVAL_SCORERS, ...IDEA_DIVERSITY_SCORERS]
}

type RunnableScorer = Awaited<ReturnType<typeof loadScorers>>[number]

/** Load a dataset's examples (as run-agnostic `RunnableEvalExample`s). */
async function loadDataset(dataset: string): Promise<RunnableEvalExample[]> {
  if (dataset === IDEA_DATASET) {
    const { IDEA_DIVERSITY_DATASET } = await import('./datasets/idea-diversity-golden')
    return IDEA_DIVERSITY_DATASET.examples
  }
  const { STORYTELLER_GOLDEN_DATASET } = await import('./datasets/storyteller-golden')
  return STORYTELLER_GOLDEN_DATASET.examples.map(example => ({
    id: example.id,
    input: inputRecord(example.input),
    referenceOutput: example.referenceOutput,
    metadata: {
      category: example.metadata.category,
      description: example.metadata.description,
      scorers: example.metadata.scorers,
    },
  }))
}

function scorerAverages(results: ScorerRunResult[]): Record<string, number> {
  const sums = new Map<string, { total: number; count: number }>()
  for (const result of results) {
    for (const [id, score] of Object.entries(result.scores)) {
      const acc = sums.get(id) ?? { total: 0, count: 0 }
      acc.total += score
      acc.count += 1
      sums.set(id, acc)
    }
  }
  const averages: Record<string, number> = {}
  for (const [id, { total, count }] of sums) {
    averages[id] = count === 0 ? 0 : total / count
  }
  return averages
}

function printSummary(
  outPath: string,
  averages: Record<string, number>,
  judgeUsage: JudgeUsage,
  failures: ScorerFailure[]
): void {
  console.log(`\n📊 Results saved to ${outPath}`)
  console.log(
    `   ${Object.entries(averages)
      .map(([id, value]) => `${id}=${(value * 100).toFixed(0)}%`)
      .join(' ')}`
  )
  console.log(
    `   judges: ${judgeUsage.inputTokens + judgeUsage.outputTokens} tokens, $${judgeUsage.costUsd.toFixed(4)}`
  )
  if (judgeUsage.unpricedModels.length > 0) {
    console.warn(
      `   ⚠️  unpriced judge model(s), cost undercounted: ${judgeUsage.unpricedModels.join(', ')}`
    )
  }
  if (failures.length === 0) return

  console.error(`\n❌ ${failures.length} scorer failure(s) — this run is not a measurement.`)
  for (const failure of failures) {
    console.error(`   ${failure.scorerId} on ${failure.exampleId}: ${failure.error}`)
  }
}

async function runEval(): Promise<MultiVariantReport> {
  const { registerCorePrompts } = await import('@/shared/agent-kernel/prompts/registry')
  registerCorePrompts()

  const ALL_SCORERS = await loadScorers()
  const judgingModel = process.env.JUDGING_MODEL || 'openai/gpt-5.6-sol (default)'
  console.log(`   Judge model: ${judgingModel}`)

  const dataset = parseDataset()
  const allExamples = await loadDataset(dataset)
  const { samples, scorerFilter } = parseArgs(allExamples.length)
  const globalScorers = scorerFilter
    ? ALL_SCORERS.filter(s => scorerFilter.includes(s.id))
    : [...ALL_SCORERS]

  if (globalScorers.length === 0) {
    throw new Error(
      'No scorers selected. Available: magic, consistency, hallucination, persona-fidelity, prose-craft, stakes-cost, story-motion, beat-plan-concreteness, critic-discipline, idea-uniqueness, idea-diversity-judge'
    )
  }

  const eligible = examplesMatchingScorers(allExamples, scorerFilter)
  if (eligible.length === 0) {
    throw new Error(
      `No golden examples allow scorers: ${scorerFilter?.join(', ') ?? '(none)'}`
    )
  }
  const examples = sampleArray(eligible, samples)
  const results: ScorerRunResult[] = []
  const failures: ScorerFailure[] = []
  let judgeUsage: JudgeUsage = EMPTY_JUDGE_USAGE

  console.log('\n🧪 Mastra Eval Runner')
  console.log(`   Dataset: ${dataset}`)
  console.log(`   Examples: ${examples.length} of ${eligible.length} eligible\n`)

  for (const example of examples) {
    const start = Date.now()
    const output = example.referenceOutput
    const scorers = scorersForExample(example, globalScorers)
    const scores: Record<string, number> = {}
    const reasoning: Record<string, string> = {}

    for (const scorer of scorers) {
      try {
        const result = await scorer.run({
          input: example.input,
          output,
        })
        scores[scorer.id] = result.score
        reasoning[scorer.id] = result.reason ?? ''
        judgeUsage = addJudgeUsage(judgeUsage, judgeUsageOf(result, judgingModel))
      } catch (error) {
        // Deliberately no score. A failure recorded as 0 is indistinguishable
        // from a genuine zero, which is how the 2026-08-18 artifact came to
        // read as a baseline when every judge had failed on a missing key.
        failures.push({ exampleId: example.id, scorerId: scorer.id, error: getErrorMessage(error) })
        console.warn(`   ⚠️  Scorer ${scorer.id} FAILED for ${example.id}: ${getErrorMessage(error)}`)
      }
    }

    results.push({
      exampleId: example.id,
      scores,
      reasoning,
      input: { ...example.input },
      output,
      metadata: {
        latencyMs: Date.now() - start,
        category: example.metadata.category,
        scenario: example.metadata.category,
      },
    })

    const scoreSummary = scorers
      .map(s => (s.id in scores ? `${s.id}=${scores[s.id].toFixed(2)}` : `${s.id}=FAILED`))
      .join(' ')
    console.log(`   ✓ ${example.id} — ${scoreSummary}`)
  }

  const scenarioNames = [...new Set(results.map(r => String(r.metadata?.scenario ?? 'general')))]
  const scenarioMetrics: Record<string, ScenarioMetrics> = {}

  for (const scenario of scenarioNames) {
    const scenarioResults = results.filter(r => r.metadata?.scenario === scenario)
    scenarioMetrics[scenario] = buildScenarioMetrics(scenarioResults)
  }

  const overallMetrics = buildScenarioMetrics(results)

  const exampleLogs: ExampleLog[] = results.map(r => ({
    id: r.exampleId,
    scenario: String(r.metadata?.scenario ?? 'general'),
    input: String(r.input.message ?? JSON.stringify(r.input)),
    output: r.output,
    score: average(Object.values(r.scores)),
    reasoning: r.reasoning,
    context: r.metadata,
  }))

  const averages = scorerAverages(results)

  const variant: VariantReport = {
    name: 'baseline',
    config: { scorers: globalScorers.map(s => s.id), samples, dataset },
    overallMetrics,
    scenarioMetrics,
    scorerAverages: averages,
    exampleLogs,
  }

  const report: MultiVariantReport = {
    id: generateRunId(),
    timestamp: new Date().toISOString(),
    // The sources this run scored. `check-eval-freshness` compares it against
    // the working tree, so a stale artifact cannot pass for a fresh one.
    inputHash: inputHash(),
    judgeUsage,
    variants: [variant],
    scenarios: scenarioNames,
    failures,
  }

  const resultsDir = path.resolve(process.cwd(), 'evals/results')
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true })
  }

  const outPath = path.join(
    resultsDir,
    dataset === IDEA_DATASET ? IDEA_OUTPUT_FILE : DEFAULT_OUTPUT_FILE
  )
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2))

  printSummary(outPath, averages, judgeUsage, failures)

  return report
}

if (require.main === module) {
  runEval()
    .then(report => {
      // A run with a failed scorer is not a measurement, and must never be
      // mistaken for one by a caller reading the exit code.
      if (report.failures.length > 0) process.exit(1)
    })
    .catch(error => {
      console.error('Eval failed:', error)
      process.exit(1)
    })
}

export { runEval }
