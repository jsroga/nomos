import { describe, expect, it } from 'vitest'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const EVALS_ROOT = join(process.cwd(), 'evals')

const REQUIRED_DIRS = [
  'baselines',
  'constants',
  'datasets',
  'fixtures',
  'judges',
  'results',
  'structural',
  'tools',
] as const

const FORBIDDEN_DIRS = [
  'scorers',
  'idea-diversity',
  'promotion',
  'report',
  'experiments',
  'scripts',
  'comparison',
] as const

const EXTRA_ALLOWED = new Set(['__tests__', 'reports'])

describe('evals/ tree', () => {
  it('keeps the eight domain folders and drops the folded ones', () => {
    const dirs = readdirSync(EVALS_ROOT).filter(name =>
      statSync(join(EVALS_ROOT, name)).isDirectory(),
    )
    for (const required of REQUIRED_DIRS) {
      expect(dirs).toContain(required)
    }
    for (const forbidden of FORBIDDEN_DIRS) {
      expect(dirs).not.toContain(forbidden)
    }
    const required = new Set<string>(REQUIRED_DIRS)
    for (const dir of dirs) {
      expect(required.has(dir) || EXTRA_ALLOWED.has(dir), dir).toBe(true)
    }
  })
})
