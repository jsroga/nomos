#!/usr/bin/env node
/**
 * Husky pre-push: critical Playwright — live Storyteller whole-flow + 2D Canvas.
 * Not the full e2e folder. Not HTTP smoke. Not character-fields.
 */
import { spawn, spawnSync } from 'node:child_process'
import dotenv from 'dotenv'
import {
  E2E_PROD_BASE_URL,
  enableOverlayFlag,
  ensureProdServer,
  hasProductionBuild,
  killListeningProdServer,
  stampProductionBuild,
} from './e2e-prod-server.mjs'

const NODE_OPTS = process.env.NODE_OPTIONS ?? '--max-old-space-size=8192'
const ENV_LOCAL_PATH = '.env.local'
const GLM_CHAT_MODEL = 'zai-coding-plan:glm-5.2'
const INSUFFICIENT_CREDITS = 'Insufficient credits'
const IN_FLIGHT_REQUESTS = 'in-flight requests'
const CREDITS_STOP =
  '\n⛔ OpenRouter credits exhausted. STOP — tell the operator and do not retry until credits are added.\n'
const CHAT_MODEL_KEY = 'STORYTELLER_CHAT_MODEL'
const BASE_URL_KEY = 'BASE_URL'
const TEST_BASE_URL_KEY = 'TEST_BASE_URL'

dotenv.config({ path: ENV_LOCAL_PATH })

function runInherit(label, cmd, args, env = process.env) {
  console.log(`\n▶ ${label}`)
  return spawnSync(cmd, args, {
    stdio: 'inherit',
    env: { ...env, NODE_OPTIONS: NODE_OPTS },
  })
}

function runLive(label, cmd, args, env = process.env) {
  console.log(`\n▶ ${label}`)
  const child = spawn(cmd, args, {
    env: { ...env, NODE_OPTIONS: NODE_OPTS },
    stdio: ['inherit', 'pipe', 'pipe'],
  })
  let combined = ''
  child.stdout.on('data', chunk => {
    const text = String(chunk)
    combined += text
    process.stdout.write(text)
  })
  child.stderr.on('data', chunk => {
    const text = String(chunk)
    combined += text
    process.stderr.write(text)
  })
  return new Promise(resolve => {
    child.on('close', code => {
      resolve({ status: code ?? 1, output: combined })
    })
  })
}

function printCreditsStop(output) {
  if (output.includes(IN_FLIGHT_REQUESTS)) return
  if (!output.includes(INSUFFICIENT_CREDITS)) return
  console.error(CREDITS_STOP)
}

function criticalEnv() {
  return {
    ...process.env,
    [CHAT_MODEL_KEY]: GLM_CHAT_MODEL,
    [BASE_URL_KEY]: E2E_PROD_BASE_URL,
    [TEST_BASE_URL_KEY]: E2E_PROD_BASE_URL,
  }
}

async function main() {
  console.log('pre-push: critical Playwright (Storyteller + 2D Canvas)…')
  enableOverlayFlag()

  await killListeningProdServer()
  if (!hasProductionBuild()) {
    const build = runInherit('production build', 'npm', ['run', 'build'])
    if (build.status !== 0) process.exit(build.status ?? 1)
    stampProductionBuild()
  }

  const server = await ensureProdServer()
  try {
    const result = await runLive('critical playwright', 'npm', ['run', 'test:e2e:critical'], criticalEnv())
    if (result.status !== 0) {
      printCreditsStop(result.output)
      process.exit(result.status ?? 1)
    }
  } finally {
    server.stop()
  }

  console.log('\npre-push: critical Playwright passed')
}

try {
  await main()
} catch (error) {
  console.error(error)
  process.exit(1)
}
