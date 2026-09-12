#!/usr/bin/env node
/**
 * Husky pre-commit entry: architecture → docs → env → typecheck → eslint → unit tests → prod build → stub Playwright.
 */
import { spawnSync } from 'node:child_process'
import { enableOverlayFlag, ensureProdServer } from './e2e-prod-server.mjs'

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

async function main() {
  console.log('pre-commit: running quality gates…')
  enableOverlayFlag()

  run('architecture layout', 'node', ['scripts/check-architecture.mjs'])
  run('agent artifacts', 'node', ['scripts/check-agent-artifacts.mjs'])
  run('docs sync', 'node', ['scripts/check-docs-updated.mjs'])
  run('eval freshness', 'node', ['scripts/check-eval-freshness.mjs'])
  run('openapi drift', 'npm', ['run', 'openapi:check'])
  run('env example', 'npm', ['run', 'env:check'])
  run('typecheck (staged)', 'node', ['scripts/pre-commit-typecheck.mjs'])
  run('eslint (staged)', 'node', ['scripts/pre-commit-lint.mjs'])
  run('unit tests', 'npm', ['run', 'test:unit'])
  run('production build', 'npm', ['run', 'build'])

  const server = await ensureProdServer()
  try {
    run('stub playwright', 'npm', ['run', 'test:e2e:stubs'])
  } finally {
    server.stop()
  }

  console.log('\npre-commit: all gates passed')
}

try {
  await main()
} catch (error) {
  console.error(error)
  process.exit(1)
}
