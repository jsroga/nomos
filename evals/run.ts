/**
 * Mastra scorer evaluation runner
 *
 * Usage:
 *   npm run eval
 *   npm run eval -- --samples=5
 *   npm run eval -- --scorers=magic
 *
 * LLM scorers use JUDGING_MODEL from .env.local (default openai:gpt-4o).
 * Example: JUDGING_MODEL=anthropic:claude-sonnet-4-20250514
 */

import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { STORYTELLER_GOLDEN_DATASET, type StorytellerGoldenExample } from './datasets/storyteller-golden'
import type {
  ExampleLog,
  MultiVariantReport,
  ScenarioMetrics,
  ScorerRunResult,
  VariantReport,
} from './types'

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

function scorersForExample(example: StorytellerGoldenExample, selected: readonly RunnableScorer[]) {
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
  const { ALL_SCORERS } = await import('@/shared/agent-kernel/scorers')
  // Deterministic domain scorers (beat-plan gate, critic discipline) live in
  // the storyteller domain — shared/ cannot import domains, so the union
  // happens here in the runner.
  const { STORYTELLER_EVAL_SCORERS } = await import('@/domains/storyteller/agents')
  return [...ALL_SCORERS, ...STORYTELLER_EVAL_SCORERS]
}

type RunnableScorer = Awaited<ReturnType<typeof loadScorers>>[number]

async function runEval(): Promise<MultiVariantReport> {
  loadEnv()

  const { registerCorePrompts } = await import('@/shared/agent-kernel/prompts/registry')
  registerCorePrompts()

  const ALL_SCORERS = await loadScorers()
  const judgingModel = process.env.JUDGING_MODEL || 'openai:gpt-4o (default)'
  console.log(`   Judge model: ${judgingModel}`)

  const allExamples = STORYTELLER_GOLDEN_DATASET.examples
  const { samples, scorerFilter } = parseArgs(allExamples.length)
  const globalScorers = scorerFilter
    ? ALL_SCORERS.filter(s => scorerFilter.includes(s.id))
    : [...ALL_SCORERS]

  if (globalScorers.length === 0) {
    throw new Error(
      'No scorers selected. Available: magic, consistency, hallucination, persona-fidelity, prose-craft, stakes-cost, beat-plan-concreteness, critic-discipline'
    )
  }

  const examples = sampleArray(allExamples, samples)
  const results: ScorerRunResult[] = []

  console.log('\n🧪 Mastra Eval Runner')
  console.log(`   Examples: ${examples.length}`)
  console.log(`   Scorers: ${globalScorers.map(s => s.id).join(', ')}\n`)

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
    score: r.scores.magic ?? 0,
    reasoning: r.reasoning,
    context: r.metadata,
  }))

  const variant: VariantReport = {
    name: 'baseline',
    config: { scorers: globalScorers.map(s => s.id), samples },
    overallMetrics,
    scenarioMetrics,
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

  const outPath = path.join(resultsDir, 'latest.json')
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2))

  console.log(`\n📊 Results saved to ${outPath}`)
  console.log(
    `   magic=${(overallMetrics.magicScore * 100).toFixed(0)}% consistency=${(overallMetrics.consistency * 100).toFixed(0)}% hallucination=${(overallMetrics.hallucination * 100).toFixed(0)}% persona=${(overallMetrics.personaFidelity * 100).toFixed(0)}%`
  )

  return report
}

if (require.main === module) {
  runEval().catch(error => {
    console.error('Eval failed:', error)
    process.exit(1)
  })
}

export { runEval }
