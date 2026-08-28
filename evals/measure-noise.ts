/**
 * Run the suite N times unchanged and record per-scorer mean and σ.
 *
 * Thresholds come from this, not from a guess: LLM judges are stochastic, and
 * a gate that fires on ordinary run-to-run drift is one that gets bypassed —
 * which is how the unenforced sentence in CLAUDE.md became the status quo.
 *
 * Usage: npx tsx evals/measure-noise.ts [--runs=3] [--dataset=storyteller]
 */
import './env-preload'
import * as fs from 'fs'
import * as path from 'path'
import { runEval } from './run'
import type { MultiVariantReport } from './types'

const DEFAULT_RUNS = 3
const BASELINES_DIR = 'evals/baselines'
const NOISE_PREFIX = 'noise'

interface ScorerNoise {
  runs: number[]
  mean: number
  stdDev: number
}

function parseRuns(): number {
  const arg = process.argv.find(a => a.startsWith('--runs='))?.split('=')[1]
  return arg ? parseInt(arg, 10) : DEFAULT_RUNS
}

function mean(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length
}

/** Population σ: these runs are the whole set being described, not a sample. */
function stdDev(values: number[]): number {
  const centre = mean(values)
  const variance = mean(values.map(value => (value - centre) ** 2))
  return Math.sqrt(variance)
}

function collectAverages(report: MultiVariantReport): Record<string, number> {
  return report.variants[0]?.scorerAverages ?? {}
}

async function measure(): Promise<void> {
  const runs = parseRuns()
  const perScorer = new Map<string, number[]>()

  for (let index = 0; index < runs; index += 1) {
    console.log(`\n── noise run ${index + 1} of ${runs} ──`)
    const report = await runEval()
    if (report.failures.length > 0) {
      throw new Error(
        `Run ${index + 1} had ${report.failures.length} scorer failure(s); noise cannot be measured from a broken run.`
      )
    }
    for (const [id, score] of Object.entries(collectAverages(report))) {
      perScorer.set(id, [...(perScorer.get(id) ?? []), score])
    }
  }

  const noise: Record<string, ScorerNoise> = {}
  for (const [id, scores] of perScorer) {
    noise[id] = { runs: scores, mean: mean(scores), stdDev: stdDev(scores) }
  }

  const date = new Date().toISOString().split('T')[0]
  const outPath = path.join(process.cwd(), BASELINES_DIR, `${NOISE_PREFIX}.${date}.json`)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(
    outPath,
    JSON.stringify({ measuredAt: new Date().toISOString(), runs, scorers: noise }, null, 2)
  )

  console.log(`\n📐 Noise written to ${outPath}`)
  for (const [id, entry] of Object.entries(noise)) {
    console.log(`   ${id.padEnd(26)} mean=${entry.mean.toFixed(4)} σ=${entry.stdDev.toFixed(4)}`)
  }
}

if (require.main === module) {
  measure().catch(error => {
    console.error('Noise measurement failed:', error)
    process.exit(1)
  })
}

export { measure }
