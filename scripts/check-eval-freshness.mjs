#!/usr/bin/env node
/**
 * Refuse a commit that changes prompts, agents or eval datasets without a
 * matching eval run.
 *
 * This is the *reminder*, not the gate. It never runs the evals — those take
 * minutes and cost model spend, and a pre-commit hook that did either would be
 * bypassed within a week. It hashes a file list and compares one string.
 *
 * The gate itself is `npm run eval:gate`.
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const RESULT_FILE = 'evals/results/latest.json'
const SKIP_TRAILER = 'Eval-Skip:'
const COMMIT_MSG_FILE = '.git/COMMIT_EDITMSG'

/** Mirrors EVAL_WATCHED_PATHS in evals/input-hash.ts. */
const WATCHED_PREFIXES = [
  'src/domains/storyteller/ai/',
  'src/domains/game-design/ai/',
  'src/domains/loop-creator/ai/',
  'src/shared/agent-kernel/',
  'evals/datasets/',
]

function stagedFiles() {
  const output = execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf8' })
  return output.split('\n').filter(Boolean)
}

/** A test edit does not invalidate a run; input-hash.ts skips them too. */
function touchesWatchedPath(files) {
  return files.some(
    file =>
      WATCHED_PREFIXES.some(prefix => file.startsWith(prefix)) &&
      !file.includes('__tests__') &&
      !file.includes('.test.')
  )
}

/**
 * An escape hatch that leaves a trace. An env var would be exported in a shell
 * profile and never seen again; a trailer is in the history and countable
 * (`evalSkipCommits` in .quality-ratchet.json).
 */
function hasSkipTrailer() {
  if (!existsSync(COMMIT_MSG_FILE)) return false
  return readFileSync(COMMIT_MSG_FILE, 'utf8')
    .split('\n')
    .some(line => line.trim().startsWith(SKIP_TRAILER))
}

function refuse(reason) {
  console.error(`check-eval-freshness: ${reason}`)
  console.error('')
  console.error('  This commit changes prompts, agents or eval datasets, but')
  console.error(`  ${RESULT_FILE} was not produced from these sources.`)
  console.error('')
  console.error('    npm run eval:gate       # runs the evals, costs model spend')
  console.error(`    ${SKIP_TRAILER} <reason>     # commit trailer, if you must`)
  console.error('')
  process.exit(1)
}

async function main() {
  const files = stagedFiles()
  if (!touchesWatchedPath(files)) {
    console.log('check-eval-freshness: no eval-relevant change — skip')
    return
  }

  if (hasSkipTrailer()) {
    console.log(`check-eval-freshness: ${SKIP_TRAILER} trailer present — skipped, and counted`)
    return
  }

  if (!existsSync(RESULT_FILE)) refuse('no eval result found')

  const report = JSON.parse(readFileSync(RESULT_FILE, 'utf8'))
  if (Array.isArray(report.failures) && report.failures.length > 0) {
    refuse(`the last eval run had ${report.failures.length} scorer failure(s)`)
  }

  const { inputHash } = await import('../evals/input-hash.mjs')
  if (report.inputHash !== inputHash()) {
    refuse('the eval result is stale')
  }

  console.log('check-eval-freshness: OK — eval result matches these sources')
}

await main()
