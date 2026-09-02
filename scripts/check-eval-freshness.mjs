#!/usr/bin/env node
/**
 * Refuse a commit that presents a failed eval comparison as a pass.
 *
 * Fixture scorers are not agent quality. A missing `passed` key is skipped,
 * and skipped is not passed. This never runs the evals.
 */
import { existsSync, readFileSync } from 'node:fs'
import { evalComparisonStatus, EvalComparisonStatus } from './eval-comparison-status.mjs'

const DEFAULT_RESULT_FILE = 'evals/results/latest.json'
const RESULT_FILE = process.env.EVAL_RESULT_FILE ?? DEFAULT_RESULT_FILE
const COMPARISON_KEY = 'comparison'

function refuse(reason) {
  console.error(`check-eval-freshness: ${reason}`)
  console.error('')
  console.error('  An eval comparison artifact has passed: false.')
  console.error('  skipped (missing passed) is not a pass.')
  console.error('')
  process.exit(1)
}

function readArtifact() {
  if (!existsSync(RESULT_FILE)) return null
  try {
    return JSON.parse(readFileSync(RESULT_FILE, 'utf8'))
  } catch {
    return null
  }
}

function comparisonArtifact(report) {
  if (report === null || typeof report !== 'object') return report
  if (Object.prototype.hasOwnProperty.call(report, COMPARISON_KEY)) {
    return Reflect.get(report, COMPARISON_KEY)
  }
  return report
}

function main() {
  const report = readArtifact()
  const status = evalComparisonStatus(comparisonArtifact(report))

  if (status === EvalComparisonStatus.Failed) {
    refuse('comparison passed: false')
  }

  if (status === EvalComparisonStatus.Skipped) {
    console.log('check-eval-freshness: no comparison.passed — skipped (not a pass)')
    return
  }

  console.log('check-eval-freshness: OK — comparison passed')
}

main()
