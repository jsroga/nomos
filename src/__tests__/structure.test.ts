/**
 * Locks the src/app and src/components conventions established by the
 * app/components restructure:
 *  - src/app holds only route groups + api + framework root files
 *  - no docs/eval/test surface duplicated inside src/app (single home is repo root)
 *  - src/components is flat: one PascalCase folder per component (+ shell/)
 *  - e2e lives only at repo root
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const REPO_ROOT = path.resolve(__dirname, '..', '..')
const APP_DIR = path.join(REPO_ROOT, 'src', 'app')
const COMPONENTS_DIR = path.join(REPO_ROOT, 'src', 'components')

const dirs = (p: string): string[] =>
  fs.existsSync(p)
    ? fs.readdirSync(p, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name)
    : []

const APP_ALLOWED = new Set(['(marketing)', '(auth)', '(workspace)', 'api'])
const APP_ROOT_FILES = new Set([
  'layout.tsx',
  'error.tsx',
  'global-error.tsx',
  'globals.css',
  'icon.png',
])
const FORBIDDEN_APP_NAMES = ['docs', 'documentation', 'evaluation', 'evals', 'e2e', 'test', 'tests', '_shell']

describe('src/app structure', () => {
  it('only contains approved route groups + api at top level', () => {
    const unexpected = dirs(APP_DIR).filter(d => !APP_ALLOWED.has(d))
    expect(unexpected, `unexpected src/app dirs: ${unexpected.join(', ')}`).toEqual([])
  })

  it('only contains approved root files at top level', () => {
    const files = fs
      .readdirSync(APP_DIR, { withFileTypes: true })
      .filter(e => e.isFile())
      .map(e => e.name)
    const unexpected = files.filter(f => !APP_ROOT_FILES.has(f))
    expect(unexpected, `unexpected src/app files: ${unexpected.join(', ')}`).toEqual([])
  })

  it('has no docs/eval/test folder anywhere under src/app', () => {
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        if (FORBIDDEN_APP_NAMES.includes(entry.name)) offenders.push(path.relative(REPO_ROOT, path.join(dir, entry.name)))
        walk(path.join(dir, entry.name))
      }
    }
    walk(APP_DIR)
    expect(offenders, `forbidden folders under src/app: ${offenders.join(', ')}`).toEqual([])
  })
})

describe('src/components structure', () => {
  it('is flat: every child is a PascalCase folder (or shell/) with a matching component file', () => {
    const problems: string[] = []
    for (const child of dirs(COMPONENTS_DIR)) {
      if (child === 'shell') continue
      if (!/^[A-Z][A-Za-z0-9]*$/.test(child)) {
        problems.push(`non-PascalCase folder: ${child}`)
        continue
      }
      const hasComponent =
        fs.existsSync(path.join(COMPONENTS_DIR, child, `${child}.tsx`)) ||
        fs.existsSync(path.join(COMPONENTS_DIR, child, `${child}.ts`))
      if (!hasComponent) problems.push(`missing ${child}/${child}.tsx`)
    }
    expect(problems, problems.join('; ')).toEqual([])
  })

  it('has no legacy bucket folders', () => {
    const buckets = dirs(COMPONENTS_DIR).filter(d => ['ui', 'auth', 'providers', 'docs'].includes(d))
    expect(buckets, `legacy component buckets present: ${buckets.join(', ')}`).toEqual([])
  })

  it('shell subfolders are PascalCase with matching component files', () => {
    const shellDir = path.join(COMPONENTS_DIR, 'shell')
    const problems: string[] = []
    for (const child of dirs(shellDir)) {
      if (!/^[A-Z][A-Za-z0-9]*$/.test(child)) problems.push(`non-PascalCase shell folder: ${child}`)
      else if (!fs.existsSync(path.join(shellDir, child, `${child}.tsx`)))
        problems.push(`missing shell/${child}/${child}.tsx`)
    }
    expect(problems, problems.join('; ')).toEqual([])
  })
})

describe('single-home invariants', () => {
  it('e2e lives only at repo root, not under src', () => {
    const strayE2e: string[] = []
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        if (entry.name === 'node_modules' || entry.name === '.next') continue
        if (entry.name === 'e2e' || entry.name === 'playwright') strayE2e.push(path.relative(REPO_ROOT, path.join(dir, entry.name)))
        walk(path.join(dir, entry.name))
      }
    }
    walk(path.join(REPO_ROOT, 'src'))
    expect(strayE2e, `e2e/playwright dirs under src: ${strayE2e.join(', ')}`).toEqual([])
    expect(fs.existsSync(path.join(REPO_ROOT, 'e2e')), 'root e2e/ missing').toBe(true)
  })

  it('docs and evals each have exactly one home (repo root)', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'docs')), 'root docs/ missing').toBe(true)
    expect(fs.existsSync(path.join(REPO_ROOT, 'evals')), 'root evals/ missing').toBe(true)
  })
})
