import { spawnSync } from 'child_process'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const VERCEL_TOKEN = process.env.VERCEL_TOKEN
const MISSING_TOKEN_MESSAGE = 'VERCEL_TOKEN is required to deploy a preview'
const VERCEL_SCOPE = process.env.VERCEL_SCOPE
const VERCEL_PROJECT = process.env.VERCEL_PROJECT
const E2E_COMMAND = 'playwright test'
const POLL_INTERVAL_MS = 5000
const DEPLOY_TIMEOUT_MS = 300_000
const CURL_TIMEOUT_SECONDS = '10'

function deploy(): string {
  if (!VERCEL_TOKEN) throw new Error(MISSING_TOKEN_MESSAGE)

  const args = ['deploy', '--yes']
  if (VERCEL_SCOPE) args.push('--scope', VERCEL_SCOPE)
  if (VERCEL_PROJECT) args.push('--project', VERCEL_PROJECT)

  const result = spawnSync('npx', ['vercel', ...args], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'inherit'],
    env: process.env,
  })

  if (result.status !== 0 || result.error) {
    throw result.error ?? new Error(`Vercel deploy failed: ${result.status}`)
  }

  const output = result.stdout ?? ''
  const match = output.match(/https:\/\/[a-zA-Z0-9-._/]+\.vercel\.app/)
  if (!match) throw new Error(`Could not parse preview URL from Vercel output:\n${output}`)
  return match[0]
}

function waitUntilReady(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()

    const poll = () => {
      const ping = spawnSync('curl', ['-fsS', '--max-time', CURL_TIMEOUT_SECONDS, url], { stdio: 'ignore' })
      if (ping.status === 0) {
        resolve()
        return
      }
      if (Date.now() - start > DEPLOY_TIMEOUT_MS) {
        reject(new Error(`Preview ${url} did not become ready within ${DEPLOY_TIMEOUT_MS}ms`))
        return
      }
      setTimeout(poll, POLL_INTERVAL_MS)
    }

    poll()
  })
}

function runE2e(url: string): void {
  const result = spawnSync('npx', E2E_COMMAND.split(' '), {
    stdio: 'inherit',
    env: {
      ...process.env,
      BASE_URL: url,
    },
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

async function main(): Promise<void> {
  const previewUrl = deploy()
  console.log(`Preview deployed: ${previewUrl}`)
  await waitUntilReady(previewUrl)
  runE2e(previewUrl)
}

main()
