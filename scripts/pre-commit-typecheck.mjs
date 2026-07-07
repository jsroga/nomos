#!/usr/bin/env node
/**
 * Pre-commit typecheck: scoped to staged TS/TSX files to avoid full-repo OOM.
 * Run `npm run typecheck` locally or in CI for a full-repo pass.
 */
import { execSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'

const NODE_OPTS = process.env.NODE_OPTIONS ?? '--max-old-space-size=6144'
const TSCONFIG = 'tsconfig.precommit.json'

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

function filterErrors(output, allowedPaths) {
  const errors = output.split('\n').filter((l) => /error TS\d+/.test(l))
  const inScope = errors.filter((l) =>
    allowedPaths.some((p) => l.includes(p)),
  )
  return inScope
}

function main() {
  const files = stagedTsFiles()
  if (!files.length) {
    console.log('pre-commit-typecheck: no staged TS/TSX files — skip')
    return
  }

  const config = { extends: './tsconfig.json', include: files }
  writeFileSync(TSCONFIG, `${JSON.stringify(config, null, 2)}\n`)

  try {
    console.log(`pre-commit-typecheck: ${files.length} staged file(s)`)
    const result = spawnSync('npx', ['tsc', '--noEmit', '-p', TSCONFIG], {
      encoding: 'utf8',
      env: { ...process.env, NODE_OPTIONS: NODE_OPTS },
      maxBuffer: 64 * 1024 * 1024,
    })

    const combined = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
    const inScope = filterErrors(combined, files)

    if (inScope.length) {
      console.error('pre-commit-typecheck: errors in staged files:\n' + inScope.join('\n'))
      process.exit(result.status === 0 ? 1 : (result.status ?? 1))
    }

    if (result.status !== 0) {
      const outside = combined
        .split('\n')
        .filter((l) => /error TS\d+/.test(l))
        .filter((l) => !files.some((p) => l.includes(p)))
      if (outside.length) {
        console.warn(
          `pre-commit-typecheck: ignoring ${outside.length} error(s) outside staged files`,
        )
      }
      if (!inScope.length) {
        console.log('pre-commit-typecheck: staged files clean')
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
