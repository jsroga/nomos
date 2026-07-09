#!/usr/bin/env node
/**
 * Pre-commit typecheck: delegates to typecheck-scoped (staged files).
 */
import { spawnSync } from 'node:child_process'
import { execSync } from 'node:child_process'

const NODE_OPTS = process.env.NODE_OPTIONS ?? '--max-old-space-size=6144'
const ATOMIC_ROOTS = ['src/shared/agent-kernel/', 'src/mastra/']

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
}

function stagedTsFiles() {
  try {
    const out = sh('git diff --cached --name-only --diff-filter=ACMR -z')
    return out.split('\0').filter((f) => /\.(ts|tsx)$/.test(f))
  } catch {
    return []
  }
}

function filesUnderAtomicRoots(staged) {
  const expanded = new Set(staged)
  for (const file of staged) {
    for (const root of ATOMIC_ROOTS) {
      if (!file.startsWith(root)) continue
      try {
        const tracked = sh(`git ls-files '${root}'`)
        for (const f of tracked.split('\n').filter(Boolean)) {
          if (/\.(ts|tsx)$/.test(f)) expanded.add(f)
        }
      } catch {
        /* empty */
      }
    }
  }
  return [...expanded]
}

function main() {
  const staged = stagedTsFiles()
  if (!staged.length) {
    console.log('pre-commit-typecheck: no staged TS/TSX files — skip')
    return
  }

  const files = filesUnderAtomicRoots(staged)
  console.log(`pre-commit-typecheck: ${files.length} file(s)`)

  const result = spawnSync('node', ['scripts/typecheck-scoped.mjs', '--files', ...files], {
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: NODE_OPTS },
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
  console.log('pre-commit-typecheck: OK')
}

main()
