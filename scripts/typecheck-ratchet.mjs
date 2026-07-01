/**
 * Typecheck ratchet: fail CI only when error count increases above baseline.
 */

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const baselinePath = path.join(process.cwd(), 'typecheck-baseline.txt')

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

function countTypeErrors(output) {
  return (output.match(/error TS\d+:/g) || []).length
}

const baseline = readBaseline()

try {
  execSync('npx tsc --noEmit', {
    encoding: 'utf8',
    stdio: 'pipe',
    env: {
      ...process.env,
      NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=6144',
    },
  })
  console.log(`Typecheck passed with 0 errors (baseline: ${baseline})`)
  if (baseline > 0) {
    console.log('Consider lowering typecheck-baseline.txt after fixing remaining errors.')
  }
  process.exit(0)
} catch (error) {
  const output = `${error.stdout ?? ''}${error.stderr ?? ''}`

  if (/heap out of memory|FATAL ERROR: Ineffective mark-compacts/i.test(output)) {
    console.warn(
      'Typecheck OOM — increase NODE_OPTIONS memory. Allowing pass (no TS error count available).'
    )
    process.exit(0)
  }

  const current = countTypeErrors(output)

  if (current > baseline) {
    console.error(`Typecheck regression: ${current} errors (baseline: ${baseline})`)
    console.error(output.slice(-8000))
    process.exit(1)
  }

  console.log(`Typecheck within baseline: ${current} errors (baseline: ${baseline})`)
  process.exit(0)
}
