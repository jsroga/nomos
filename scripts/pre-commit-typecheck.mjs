#!/usr/bin/env node
/**
 * Pre-commit typecheck: scoped to staged TS/TSX files to avoid full-repo OOM.
 * When a staged file lives under an atomic root (e.g. agent-kernel), typecheck
 * the whole tree so cross-file errors in the same package are not ignored.
 * Run `npm run typecheck` locally or in CI for a full-repo pass.
 */
import { execSync, spawnSync } from 'node:child_process'
import { existsSync, unlinkSync, writeFileSync } from 'node:fs'

const NODE_OPTS = process.env.NODE_OPTIONS ?? '--max-old-space-size=6144'
const TSCONFIG = 'tsconfig.precommit.json'

/** Typecheck the full subtree when any file under these prefixes is staged. */
const ATOMIC_ROOTS = ['src/shared/agent-kernel/', 'src/mastra/']

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
}

function stagedTsFiles() {
  try {
    const out = sh('git diff --cached --name-only --diff-filter=ACMR -z')
    return out
      .split('\0')
      .filter((f) => /\.(ts|tsx)$/.test(f))
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
        // root may not exist yet
      }
    }
  }
  return [...expanded]
}

function filterErrors(output, allowedPaths) {
  const errors = output.split('\n').filter((l) => /error TS\d+/.test(l))
  const inScope = errors.filter((l) =>
    allowedPaths.some((p) => l.includes(p)),
  )
  return inScope
}

function main() {
  const staged = stagedTsFiles()
  if (!staged.length) {
    console.log('pre-commit-typecheck: no staged TS/TSX files — skip')
    return
  }

  const files = filesUnderAtomicRoots(staged)
  const expanded = files.length > staged.length
  if (expanded) {
    console.log(
      `pre-commit-typecheck: expanded to ${files.length} file(s) (atomic roots: ${ATOMIC_ROOTS.join(', ')})`,
    )
  }

  const config = { extends: './tsconfig.json', include: files }
  writeFileSync(TSCONFIG, `${JSON.stringify(config, null, 2)}\n`)

  try {
    if (!expanded) {
      console.log(`pre-commit-typecheck: ${files.length} staged file(s)`)
    }
    const result = spawnSync('npx', ['tsc', '--noEmit', '-p', TSCONFIG], {
      encoding: 'utf8',
      env: { ...process.env, NODE_OPTIONS: NODE_OPTS },
      maxBuffer: 64 * 1024 * 1024,
    })

    const combined = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
    const inScope = filterErrors(combined, files)

    if (inScope.length) {
      console.error('pre-commit-typecheck: errors in scope:\n' + inScope.join('\n'))
      process.exit(result.status === 0 ? 1 : (result.status ?? 1))
    }

    if (result.status !== 0) {
      const outside = combined
        .split('\n')
        .filter((l) => /error TS\d+/.test(l))
        .filter((l) => !files.some((p) => l.includes(p)))
      if (outside.length) {
        console.warn(
          `pre-commit-typecheck: ignoring ${outside.length} error(s) outside scope`,
        )
      }
      if (!inScope.length) {
        console.log('pre-commit-typecheck: scoped files clean')
        return
      }
      console.error(combined)
      process.exit(result.status ?? 1)
    }

    console.log('pre-commit-typecheck: OK')
  } finally {
    if (existsSync(TSCONFIG)) unlinkSync(TSCONFIG)
  }
}

main()
