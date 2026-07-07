#!/usr/bin/env node
/**
 * Husky pre-commit entry: architecture → docs → typecheck → unit tests → prod build.
 */
import { spawnSync } from 'node:child_process'

const NODE_OPTS = process.env.NODE_OPTIONS ?? '--max-old-space-size=6144'

function run(label, cmd, args, { optional = false } = {}) {
  console.log(`\n▶ ${label}`)
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: NODE_OPTS },
  })
  if (result.status !== 0) {
    if (optional) {
      console.warn(`${label}: skipped or non-fatal`)
      return
    }
    process.exit(result.status ?? 1)
  }
}

function main() {
  console.log('pre-commit: running quality gates…')

  run('architecture layout', 'node', ['scripts/check-architecture.mjs'])
  run('docs sync', 'node', ['scripts/check-docs-updated.mjs'])
  run('typecheck (staged)', 'node', ['scripts/pre-commit-typecheck.mjs'])
  run('unit tests', 'npm', ['run', 'test:unit'])
  run('production build', 'npm', ['run', 'build'])

  console.log('\npre-commit: all gates passed')
}

main()
