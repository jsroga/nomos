/**
 * ESLint ratchet: block on errors; block when warning count exceeds baseline.
 */

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const baselinePath = path.join(process.cwd(), 'eslint-warnings-baseline.txt')

function readBaseline() {
  if (!fs.existsSync(baselinePath)) {
    console.error(`Missing baseline file: ${baselinePath}`)
    process.exit(1)
  }
  const value = parseInt(fs.readFileSync(baselinePath, 'utf8').trim(), 10)
  if (Number.isNaN(value)) {
    console.error(`Invalid baseline in ${baselinePath}`)
    process.exit(1)
  }
  return value
}

const baseline = readBaseline()

try {
  execSync(`npx eslint . --max-warnings=${baseline}`, {
    encoding: 'utf8',
    stdio: 'pipe',
  })
  console.log(`ESLint passed (${baseline} warnings allowed by baseline)`)
  process.exit(0)
} catch (error) {
  const output = `${error.stdout ?? ''}${error.stderr ?? ''}`
  const errors = (output.match(/\serror\s/g) || []).length
  const warnings = (output.match(/\swarning\s/g) || []).length

  if (errors > 0) {
    console.error(`ESLint errors found: ${errors}`)
    console.error(output.slice(-8000))
    process.exit(1)
  }

  if (warnings > baseline) {
    console.error(`ESLint warning regression: ${warnings} warnings (baseline: ${baseline})`)
    console.error(output.slice(-8000))
    process.exit(1)
  }

  console.log(`ESLint within baseline: ${warnings} warnings (baseline: ${baseline})`)
  process.exit(0)
}
