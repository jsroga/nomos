#!/usr/bin/env node
/**
 * Husky pre-commit: full-app lint + typecheck + unit always.
 * Eval freshness, HTTP smoke, and overlay stub Playwright run only when staged
 * (or working-tree, if the index is empty) paths select them.
 * Critical Playwright (Storyteller + 2D Canvas) runs on pre-push when the
 * push contains product source under src/, not tests. Unit tests always run.
 */
import { spawnSync } from 'node:child_process'
import dotenv from 'dotenv'
import {
  E2E_PROD_BASE_URL,
  enableOverlayFlag,
  ensureProdServer,
  killListeningProdServer,
} from './e2e-prod-server.mjs'
import {
  filesForPrecommitSuites,
  needsProdServer,
  PrecommitSuite,
  selectPrecommitSuites,
} from './precommit-suites.mjs'

const NODE_OPTS = process.env.NODE_OPTIONS ?? '--max-old-space-size=8192'
const ENV_LOCAL_PATH = '.env.local'
const GLM_CHAT_MODEL = 'zai-coding-plan:glm-5.2'
const INSUFFICIENT_CREDITS = 'Insufficient credits'
const IN_FLIGHT_REQUESTS = 'in-flight requests'
const CREDITS_STOP =
  '\n⛔ OpenRouter credits exhausted. STOP — tell the operator and do not retry until credits are added.\n'
const TEST_BASE_URL_KEY = 'TEST_BASE_URL'
const CHAT_MODEL_KEY = 'STORYTELLER_CHAT_MODEL'

dotenv.config({ path: ENV_LOCAL_PATH })

function run(label, cmd, args, { optional = false, env = process.env, capture = false } = {}) {
  console.log(`\n▶ ${label}`)
  const result = spawnSync(cmd, args, {
    encoding: capture ? 'utf8' : undefined,
    stdio: capture ? undefined : 'inherit',
    env: { ...env, NODE_OPTIONS: NODE_OPTS },
  })
  if (capture) {
    process.stdout.write(result.stdout ?? '')
    process.stderr.write(result.stderr ?? '')
  }
  if (result.status !== 0) {
    if (optional) {
      console.warn(`${label}: skipped or non-fatal`)
      return result
    }
    if (capture) printCreditsStop(`${result.stdout ?? ''}\n${result.stderr ?? ''}`)
    process.exit(result.status ?? 1)
  }
  return result
}

function printCreditsStop(output) {
  if (output.includes(IN_FLIGHT_REQUESTS)) return
  if (!output.includes(INSUFFICIENT_CREDITS)) return
  console.error(CREDITS_STOP)
}

function liveEnv() {
  return {
    ...process.env,
    [CHAT_MODEL_KEY]: GLM_CHAT_MODEL,
    [TEST_BASE_URL_KEY]: E2E_PROD_BASE_URL,
  }
}

async function main() {
  console.log('pre-commit: running quality gates…')
  enableOverlayFlag()

  const files = filesForPrecommitSuites()
  const suites = selectPrecommitSuites(files)
  console.log(
    suites.length
      ? `pre-commit: selected ${suites.join(', ')} (${files.length} path(s))`
      : `pre-commit: no file-selected e2e/eval (${files.length} path(s))`,
  )

  run('architecture layout', 'node', ['scripts/check-architecture.mjs'])
  run('agent artifacts', 'node', ['scripts/check-agent-artifacts.mjs'])
  run('docs sync', 'node', ['scripts/check-docs-updated.mjs'])
  run('openapi drift', 'npm', ['run', 'openapi:check'])
  run('env example', 'npm', ['run', 'env:check'])

  if (suites.includes(PrecommitSuite.EvalFreshness)) {
    run('eval freshness', 'node', ['scripts/check-eval-freshness.mjs'])
  } else {
    console.log('\n▶ eval freshness\npre-commit: skip eval freshness (no watched paths)')
  }

  run('typecheck (full)', 'npm', ['run', 'typecheck'])
  run('eslint (full)', 'npm', ['run', 'lint'])
  run('unit tests', 'npm', ['run', 'test:unit'])

  if (!needsProdServer(suites)) {
    console.log('\npre-commit: skip production build and e2e (not selected)')
    console.log('\npre-commit: all gates passed')
    return
  }

  await killListeningProdServer()
  run('production build', 'npm', ['run', 'build'])
  const server = await ensureProdServer()
  try {
    if (suites.includes(PrecommitSuite.E2eStubs)) {
      run('stub playwright', 'npm', ['run', 'test:e2e:stubs'])
    }
    if (suites.includes(PrecommitSuite.E2eSmoke)) {
      run('http smoke', 'npm', ['run', 'test:e2e', '--', 'smoke'], {
        env: liveEnv(),
        capture: true,
      })
    }
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
