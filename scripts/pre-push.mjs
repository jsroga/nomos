#!/usr/bin/env node
/**
 * Husky pre-push: live Storyteller Playwright (GLM) — whole-flow + generate missing fields. Not the full e2e folder. Not HTTP smoke.
 */
import { spawnSync } from 'node:child_process'
import dotenv from 'dotenv'
import { enableOverlayFlag, ensureProdServer, hasProductionBuild } from './e2e-prod-server.mjs'

const NODE_OPTS = process.env.NODE_OPTIONS ?? '--max-old-space-size=6144'
const ENV_LOCAL_PATH = '.env.local'
const GLM_CHAT_MODEL = 'zai-coding-plan:glm-5.2'
const INSUFFICIENT_CREDITS = 'Insufficient credits'
const IN_FLIGHT_REQUESTS = 'in-flight requests'
const CREDITS_STOP = '\n⛔ OpenRouter credits exhausted. STOP — tell the operator and do not retry until credits are added.\n'

dotenv.config({ path: ENV_LOCAL_PATH })

function run(label, cmd, args) {
  console.log(`\n▶ ${label}`)
  const result = spawnSync(cmd, args, {
    encoding: 'utf8',
    env: { ...process.env, NODE_OPTIONS: NODE_OPTS },
  })
  process.stdout.write(result.stdout ?? '')
  process.stderr.write(result.stderr ?? '')
  return result
}

function printCreditsStop(output) {
  if (output.includes(IN_FLIGHT_REQUESTS)) return
  if (!output.includes(INSUFFICIENT_CREDITS)) return
  console.error(CREDITS_STOP)
}

async function main() {
  console.log('pre-push: live Storyteller Playwright…')
  enableOverlayFlag()
  process.env.STORYTELLER_CHAT_MODEL = GLM_CHAT_MODEL

  if (!hasProductionBuild()) {
    const build = run('production build', 'npm', ['run', 'build'])
    if (build.status !== 0) process.exit(build.status ?? 1)
  }

  const server = await ensureProdServer()
  try {
    const result = run('live storyteller playwright', 'npm', ['run', 'test:e2e:live-storyteller'])
    if (result.status !== 0) {
      printCreditsStop(`${result.stdout ?? ''}\n${result.stderr ?? ''}`)
      process.exit(result.status ?? 1)
    }
  } finally {
    server.stop()
  }

  console.log('\npre-push: live Storyteller passed')
}

try {
  await main()
} catch (error) {
  console.error(error)
  process.exit(1)
}
