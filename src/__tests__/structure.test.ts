/**
 * Locks target repo layout from docs/ARCHITECTURE.md (src topology + module blueprint).
 *
 *  - src/ top-level: 7 folders + mastra.ts + mastra/ CLI shim + __tests__
 *  - src/app: route groups + api only
 *  - src/components: flat PascalCase folder per component (+ shell/)
 *  - src/shared: target children + documented legacy migration folders
 *  - single-home: docs/, evals/, e2e/ at repo root only
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { findDocsCatalogViolations } from '../../scripts/structure-gates/docs-catalog'
import {
  DOCS_ALLOWED_FILES,
  SHARED_TOP_LEVEL_FORBIDDEN,
  SHARED_TOP_LEVEL_LEGACY,
  SHARED_TOP_LEVEL_TARGET,
  SINGLE_HOME_AT_REPO_ROOT,
  SRC_ROOT_FILES_ALLOWED,
  SRC_TOP_LEVEL_ALLOWED,
  SRC_TOP_LEVEL_FORBIDDEN,
} from '../../scripts/structure-gates/src-topology'
import { findNonTestFilesInTestDirs } from '../../scripts/structure-gates/test-folder-rules'

const REPO_ROOT = path.resolve(__dirname, '..', '..')
const SRC_DIR = path.join(REPO_ROOT, 'src')
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

describe('src/ topology (docs/ARCHITECTURE.md § target)', () => {
  it('only contains approved top-level folders', () => {
    const dirs = fs.existsSync(SRC_DIR)
      ? fs.readdirSync(SRC_DIR, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name)
      : []
    const unexpected = dirs.filter(d => !SRC_TOP_LEVEL_ALLOWED.has(d))
    expect(unexpected, `unexpected src/ dirs: ${unexpected.join(', ')}`).toEqual([])
  })

  it('has no forbidden legacy or duplicate-home folders at src/ top level', () => {
    const dirs = fs.existsSync(SRC_DIR)
      ? fs.readdirSync(SRC_DIR, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name)
      : []
    const forbidden = dirs.filter(d => SRC_TOP_LEVEL_FORBIDDEN.has(d))
    expect(forbidden, `forbidden src/ dirs: ${forbidden.join(', ')}`).toEqual([])
  })

  it('only contains approved root files at src/ top level', () => {
    const files = fs.existsSync(SRC_DIR)
      ? fs.readdirSync(SRC_DIR, { withFileTypes: true }).filter(e => e.isFile()).map(e => e.name)
      : []
    const unexpected = files.filter(f => !SRC_ROOT_FILES_ALLOWED.has(f))
    expect(unexpected, `unexpected src/ files: ${unexpected.join(', ')}`).toEqual([])
  })

  it('has no duplicate single-home folders under src/', () => {
    const offenders: string[] = []
    for (const name of SINGLE_HOME_AT_REPO_ROOT) {
      if (fs.existsSync(path.join(SRC_DIR, name))) offenders.push(`src/${name}`)
    }
    expect(offenders, `duplicate homes under src/: ${offenders.join(', ')}`).toEqual([])
  })
})

describe('src/shared topology (docs/ARCHITECTURE.md)', () => {
  const sharedDir = path.join(SRC_DIR, 'shared')

  it('children are target folders or documented legacy migration folders', () => {
    if (!fs.existsSync(sharedDir)) return
    const dirs = fs
      .readdirSync(sharedDir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name)
    const allowed = new Set([...SHARED_TOP_LEVEL_TARGET, ...SHARED_TOP_LEVEL_LEGACY])
    const unexpected = dirs.filter(d => !allowed.has(d))
    expect(unexpected, `unexpected src/shared/ dirs: ${unexpected.join(', ')}`).toEqual([])
  })

  it('has no forbidden parallel bucket folders', () => {
    if (!fs.existsSync(sharedDir)) return
    const dirs = fs
      .readdirSync(sharedDir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name)
    const forbidden = dirs.filter(d => SHARED_TOP_LEVEL_FORBIDDEN.has(d))
    expect(forbidden, `forbidden src/shared/ dirs: ${forbidden.join(', ')}`).toEqual([])
  })
})

describe('src/mastra Studio entry', () => {
  const mastraDir = path.join(SRC_DIR, 'mastra')

  it('contains only index.ts, agents/, and optional public/', () => {
    if (!fs.existsSync(mastraDir)) return
    const entries = fs.readdirSync(mastraDir)
    const allowed = new Set(['index.ts', 'agents', 'public'])
    const unexpected = entries.filter(e => !allowed.has(e))
    expect(
      unexpected,
      `src/mastra/ allowed: index.ts, agents/, public/ — found: ${entries.join(', ')}`,
    ).toEqual([])
  })
})

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
        const full = path.join(dir, entry.name)
        const rel = path.relative(REPO_ROOT, full)
        // Admin Tests dashboard routes are product surfaces, not stray test trees.
        const isAdminTestsRoute =
          entry.name === 'tests' &&
          (rel.includes(`${path.sep}admin${path.sep}tests`) ||
            rel.endsWith(`${path.sep}admin${path.sep}tests`))
        if (FORBIDDEN_APP_NAMES.includes(entry.name) && !isAdminTestsRoute) {
          offenders.push(rel)
        }
        walk(full)
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

describe('__tests__ folder purity', () => {
  it('contains only *.test.ts / *.test.tsx files under src/', () => {
    const offenders = findNonTestFilesInTestDirs(SRC_DIR)
    expect(
      offenders,
      `__tests__ folders must only contain test files — move helpers to scripts/: ${offenders.join(', ')}`,
    ).toEqual([])
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

describe('docs/ flat catalog (no trash)', () => {
  const docsDir = path.join(REPO_ROOT, 'docs')

  it('contains only the six allowlisted markdown files (no subfolders)', () => {
    const violations = findDocsCatalogViolations(docsDir)
    expect(
      violations,
      violations.map((v) => `${v.path}: ${v.reason}`).join('\n'),
    ).toEqual([])
  })

  it('allowlist matches docs/README catalog size', () => {
    expect(DOCS_ALLOWED_FILES.size).toBe(6)
  })
})
