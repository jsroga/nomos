/**
 * `npm run eval:gate` — run the evals, compare against a baseline, refuse a
 * regression.
 *
 * This is the gate. `scripts/check-eval-freshness.mjs` is only the *reminder*
 * that it needs running: a pre-commit hook that ran the evals would cost
 * minutes and real money on every commit, and would be bypassed within a week.
 */
import './env-preload'
import * as fs from 'fs'
import * as path from 'path'
import { runEval } from './run'
import { compareToBaseline, formatComparison, type EvalBaseline } from './compare'
import { EVAL_BASELINE, EVAL_GATE_MESSAGE } from './constants/gate'

/** The newest dated baseline for a dataset, or null when none is chosen yet. */
function resolveBaselinePath(dataset: string): string | null {
  const explicit = process.argv.find(a => a.startsWith('--baseline='))?.split('=')[1]
  if (explicit) return explicit

  const dir = path.resolve(process.cwd(), EVAL_BASELINE.DIRECTORY)
  if (!fs.existsSync(dir)) return null
  const candidates = fs
    .readdirSync(dir)
    .filter(name => name.startsWith(`${dataset}.`) && name.endsWith(EVAL_BASELINE.EXTENSION))
    .sort()
  const newest = candidates[candidates.length - 1]
  return newest ? path.join(dir, newest) : null
}

function readBaseline(file: string): EvalBaseline {
  const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (typeof parsed !== 'object' || parsed === null || !('scorers' in parsed)) {
    throw new Error(`${EVAL_GATE_MESSAGE.MALFORMED_BASELINE} ${file}`)
  }
  return Object(parsed)
}

async function gate(): Promise<number> {
  const report = await runEval()

  if (report.failures.length > 0) {
    console.error(`\n${EVAL_GATE_MESSAGE.RUN_HAD_FAILURES}`)
    return 1
  }

  const dataset = String(report.variants[0]?.config.dataset ?? EVAL_BASELINE.DEFAULT_DATASET)
  const baselinePath = resolveBaselinePath(dataset)
  if (!baselinePath) {
    console.error(`\n${EVAL_GATE_MESSAGE.NO_BASELINE} ${dataset}`)
    return 1
  }

  const result = compareToBaseline(report, readBaseline(baselinePath))
  console.log(formatComparison(result, path.relative(process.cwd(), baselinePath)))

  if (result.cost?.exceeded) {
    console.error(`\n${EVAL_GATE_MESSAGE.OVER_BUDGET}`)
    return 1
  }

  if (result.regressions.length === 0) {
    console.log(`\n${EVAL_GATE_MESSAGE.PASSED}`)
    return 0
  }

  console.error(`\n${EVAL_GATE_MESSAGE.REGRESSED}`)
  for (const row of result.regressions) {
    console.error(`   ${row.id}: ${row.verdict} (allowed drop ${row.threshold.toFixed(4)})`)
  }
  return 1
}

if (require.main === module) {
  gate()
    .then(code => process.exit(code))
    .catch(error => {
      console.error('Eval gate failed:', error)
      process.exit(1)
    })
}

export { gate }
