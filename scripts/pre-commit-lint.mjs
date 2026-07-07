#!/usr/bin/env node
/**
 * Pre-commit ESLint: scoped to staged TS/TSX/JS/JSX/MJS files.
 * Run `npm run lint` for a full-repo pass.
 */
import { spawnSync } from 'node:child_process'
import { execSync } from 'node:child_process'

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
}

function stagedLintFiles() {
  try {
    const out = sh('git diff --cached --name-only --diff-filter=ACMR -z')
    return out
      .split('\0')
      .filter((f) => /\.(ts|tsx|js|jsx|mjs)$/.test(f))
      .filter((f) => !f.startsWith('.mastra/'))
  } catch {
    return []
  }
}

function main() {
  const files = stagedLintFiles()
  if (!files.length) {
    console.log('pre-commit-lint: no staged lintable files — skip')
    return
  }

  console.log(`pre-commit-lint: ${files.length} staged file(s)`)
  const result = spawnSync('npx', ['eslint', ...files], {
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }

  console.log('pre-commit-lint: OK')
}

main()
