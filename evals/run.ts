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

import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { inputRecord } from '@/shared/agent-kernel/scorers/shared'
import { examplesMatchingScorers } from './select-eval-examples'
import type {
  ExampleLog,
  MultiVariantReport,
  RunnableEvalExample,
  ScenarioMetrics,
  ScorerRunResult,
  VariantReport,
} from './types'

const DEFAULT_DATASET = 'storyteller'
const IDEA_DATASET = 'idea-diversity'
const DEFAULT_OUTPUT_FILE = 'latest.json'
const IDEA_OUTPUT_FILE = 'idea-diversity-latest.json'

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath })
  } else {
    dotenv.config()
  }
}

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

function buildScenarioMetrics(results: ScorerRunResult[]): ScenarioMetrics {
  const collect = (key: string) => results.map(r => r.scores[key] ?? 0)
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

async function runEval(): Promise<MultiVariantReport> {
  loadEnv()

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
      } catch (error) {
        console.warn(`   ⚠️  Scorer ${scorer.id} failed for ${example.id}:`, error)
        scores[scorer.id] = 0
        reasoning[scorer.id] = String(error)
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

    const scoreSummary = scorers.map(s => `${s.id}=${(scores[s.id] ?? 0).toFixed(2)}`).join(' ')
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
    variants: [variant],
    scenarios: scenarioNames,
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

  console.log(`\n📊 Results saved to ${outPath}`)
  const averageSummary = Object.entries(averages)
    .map(([id, value]) => `${id}=${(value * 100).toFixed(0)}%`)
    .join(' ')
  console.log(`   ${averageSummary}`)

  return report
}

if (require.main === module) {
  runEval().catch(error => {
    console.error('Eval failed:', error)
    process.exit(1)
  })
}

export { runEval }
