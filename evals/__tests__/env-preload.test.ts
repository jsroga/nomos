/**
 * The eval runner's judges are only as configured as its import order.
 *
 * `@/shared/config/env` parses `process.env` once at import, and ES imports
 * execute before the importing module's body — so `dotenv.config()` inside
 * `runEval()` ran after every scorer module had already frozen an empty
 * config. Every judge was built with no OpenRouter key, threw
 * `AI_LoadAPIKeyError`, and the runner recorded the failure as a score of 0.
 * That is how a committed baseline came to read all zeros with a latency of
 * 4.67 ms.
 *
 * Reordering these imports would silently reproduce it, so the order is pinned.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const PRELOAD_SPECIFIER = './env-preload'
const IMPORT_LINE = /^import\s/

function firstImportOf(file: string): string {
  const line = readFileSync(file, 'utf8')
    .split('\n')
    .find(candidate => IMPORT_LINE.test(candidate))
  return line ?? ''
}

describe('eval entrypoints', () => {
  it('loads .env.local before any module that reads configuration', () => {
    expect(firstImportOf('evals/run.ts')).toContain(PRELOAD_SPECIFIER)
  })

  it('keeps the preload free of imports that read config themselves', () => {
    const imports = readFileSync('evals/env-preload.ts', 'utf8')
      .split('\n')
      .filter(line => IMPORT_LINE.test(line))

    expect(imports.some(line => line.includes('@/'))).toBe(false)
  })
})
