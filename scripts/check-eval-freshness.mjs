#!/usr/bin/env node
/**
 * Refuse a commit that presents a failed eval comparison as a pass,
 * or an artifact whose inputHash no longer matches the watched sources.
 *
 * Fixture scorers are not agent quality. A missing `passed` key is skipped,
 * and skipped is not passed. This never runs the evals.
 */
import { existsSync, readFileSync } from 'node:fs'
import { inputHash } from '../evals/input-hash.mjs'
import { evalComparisonStatus, EvalComparisonStatus } from './eval-comparison-status.mjs'

const DEFAULT_RESULT_FILE = 'evals/results/latest.json'
const RESULT_FILE = process.env.EVAL_RESULT_FILE ?? DEFAULT_RESULT_FILE
const COMPARISON_KEY = 'comparison'
const INPUT_HASH_KEY = 'inputHash'

function refuse(reason) {
  console.error(`check-eval-freshness: ${reason}`)
  console.error('')
  console.error('  An eval comparison artifact has passed: false.')
  console.error('  skipped (missing passed) is not a pass.')
  console.error('')
  process.exit(1)
}

function refuseStaleHash(artifactHash, currentHash) {
  console.error('check-eval-freshness: inputHash mismatch')
  console.error('')
  console.error(`  artifact: ${artifactHash}`)
  console.error(`  current:  ${currentHash}`)
  console.error('  Re-run: npm run eval:scorer-fixture')
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

function artifactInputHash(report) {
  if (report === null || typeof report !== 'object') return null
  if (!Object.prototype.hasOwnProperty.call(report, INPUT_HASH_KEY)) return null
  const value = Reflect.get(report, INPUT_HASH_KEY)
  return typeof value === 'string' ? value : null
}

function main() {
  const report = readArtifact()
  const status = evalComparisonStatus(comparisonArtifact(report))

  if (status === EvalComparisonStatus.Failed) {
    refuse('comparison passed: false')
  }

  const artifactHash = artifactInputHash(report)
  if (artifactHash !== null) {
    const current = inputHash()
    if (artifactHash !== current) {
      refuseStaleHash(artifactHash, current)
    }
  }

  if (status === EvalComparisonStatus.Skipped) {
    console.log('check-eval-freshness: no comparison.passed — skipped (not a pass)')
    return
  }

  console.log('check-eval-freshness: OK — comparison passed')
}

main()
