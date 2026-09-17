#!/usr/bin/env node
/**
 * File-selected pre-commit suites. Lint/tsc/unit always run in pre-commit.mjs;
 * this module only decides eval freshness and which smoke/stub jobs to start.
 * Critical Playwright (Storyteller whole-flow + 2D Canvas) runs on pre-push
 * when the push contains product source under src/, not tests.
 */
import { execSync } from 'node:child_process'
import { EVAL_WATCHED_PATHS } from '../evals/input-hash.mjs'

export const PrecommitSuite = {
  EvalFreshness: 'eval-freshness',
  E2eStubs: 'e2e-stubs',
  E2eSmoke: 'e2e-smoke',
}

const EVAL_PREFIXES = [...EVAL_WATCHED_PATHS, 'evals/results', 'evals/input-hash.mjs']

const STUB_PREFIXES = [
  'e2e/scenarios/workspace-chat-overlay.spec.ts',
  'src/shared/chat/ui/WorkspaceChatOverlay',
  'src/shared/chat/state',
]

const SMOKE_PREFIXES = [
  'e2e/scenarios/storyteller-smoke.script.ts',
  'e2e/constants/storyteller-smoke.ts',
  'src/app/api/storyteller/chat',
  'src/shared/ai/gateway',
  'src/shared/auth/api-default-deny.ts',
  'src/shared/auth/auth.ts',
  'src/shared/auth/site-basic-auth.ts',
  'src/shared/auth/utils/e2e-bypass.ts',
  'src/domains/storyteller/config',
  'src/domains/storyteller/core/io/mastra-runtime.ts',
  'src/domains/storyteller/ai/agents/StorytellerAgent',
  'src/shared/agent-kernel/models.ts',
]

const SHARED_E2E_INFRA = ['playwright.config.ts']

const SUITE_PREFIXES = {
  [PrecommitSuite.EvalFreshness]: EVAL_PREFIXES,
  [PrecommitSuite.E2eStubs]: STUB_PREFIXES,
  [PrecommitSuite.E2eSmoke]: SMOKE_PREFIXES,
}

export function pathMatchesPrefix(file, prefix) {
  const posix = file.split('\\').join('/')
  return posix === prefix || posix.startsWith(`${prefix}/`)
}

export function selectPrecommitSuites(files) {
  const selected = new Set()
  for (const file of files) {
    const posix = file.split('\\').join('/')
    if (SHARED_E2E_INFRA.some((prefix) => pathMatchesPrefix(posix, prefix))) {
      selected.add(PrecommitSuite.E2eStubs)
      selected.add(PrecommitSuite.E2eSmoke)
    }
    for (const [suite, prefixes] of Object.entries(SUITE_PREFIXES)) {
      if (prefixes.some((prefix) => pathMatchesPrefix(posix, prefix))) {
        selected.add(suite)
      }
    }
  }
  return [...selected]
}

export function needsProdServer(suites) {
  return suites.includes(PrecommitSuite.E2eStubs) || suites.includes(PrecommitSuite.E2eSmoke)
}

const TEST_FILE = /\.(?:test|spec|e2e\.test)\.[cm]?[jt]sx?$/
export const ZERO_OID = '0'.repeat(40)
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904'

/** Product runtime under src/. Tests and specs never select live pre-push e2e. */
export function isProductSourcePath(file) {
  const posix = file.split('\\').join('/')
  if (!posix.startsWith('src/')) return false
  if (posix.includes('/__tests__/')) return false
  if (TEST_FILE.test(posix)) return false
  return true
}

export function needsCriticalE2e(files) {
  return files.some(isProductSourcePath)
}

export function parsePushRefLines(stdinText) {
  return stdinText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/)
      return {
        localRef: parts[0] ?? '',
        localOid: parts[1] ?? '',
        remoteRef: parts[2] ?? '',
        remoteOid: parts[3] ?? '',
      }
    })
    .filter((ref) => Boolean(ref.localOid))
}

function gitDiffNames(fromOid, toOid) {
  if (!toOid) return []
  if (!fromOid || fromOid === ZERO_OID) {
    try {
      const base = execSync(`git merge-base origin/main ${toOid}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim()
      if (base) {
        return gitLines(`git diff --name-only --diff-filter=ACMRD ${base} ${toOid}`)
      }
    } catch {
      // New branch with no merge-base: compare the whole tree.
    }
    return gitLines(`git diff --name-only --diff-filter=ACMRD ${EMPTY_TREE} ${toOid}`)
  }
  return gitLines(`git diff --name-only --diff-filter=ACMRD ${fromOid} ${toOid}`)
}

/** Husky pre-push stdin refs, else commits not yet on the upstream. */
export function filesForPrepush(stdinText = '') {
  const refs = parsePushRefLines(stdinText)
  if (refs.length > 0) {
    const files = new Set()
    for (const ref of refs) {
      for (const file of gitDiffNames(ref.remoteOid, ref.localOid)) files.add(file)
    }
    return [...files]
  }
  const upstream = gitLines("git rev-parse --abbrev-ref '@{u}'")
  if (upstream.length > 0) {
    return gitLines("git diff --name-only --diff-filter=ACMRD '@{u}'...HEAD")
  }
  return gitLines('git diff --name-only --diff-filter=ACMRD origin/main...HEAD')
}

function gitLines(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

export function gitStagedFiles() {
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=ACMR -z', {
      encoding: 'utf8',
    })
    return out.split('\0').filter(Boolean)
  } catch {
    return []
  }
}

export function gitWorkingTreeFiles() {
  const diff = gitLines('git diff --name-only --diff-filter=ACMR HEAD')
  const extra = gitLines('git ls-files --others --exclude-standard')
  return [...new Set([...diff, ...extra])]
}

/** Husky: staged index. Manual `npm run precommit` with an empty index: working tree. */
export function filesForPrecommitSuites() {
  const staged = gitStagedFiles()
  if (staged.length > 0) return staged
  return gitWorkingTreeFiles()
}
