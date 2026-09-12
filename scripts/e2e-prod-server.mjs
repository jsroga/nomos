import { spawn } from 'node:child_process'
import { createConnection } from 'node:net'
import { existsSync } from 'node:fs'

const DEV_SERVER_PORT = 3001
const LOCAL_BASE_URL = `http://localhost:${DEV_SERVER_PORT}`
const READY_TIMEOUT_MS = 120_000
const READY_POLL_MS = 500
const OVERLAY_FLAG = 'NEXT_PUBLIC_FF_WORKSPACE_CHAT_OVERLAY'
const OVERLAY_ON = 'true'
const NODE_HEAP = '--max-old-space-size=8192'

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

export function enableOverlayFlag(env = process.env) {
  env[OVERLAY_FLAG] = OVERLAY_ON
}

function isPortOpen(port) {
  return new Promise(resolve => {
    const socket = createConnection({ port, host: '127.0.0.1' })
    socket.once('connect', () => {
      socket.end()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
  })
}

async function waitForReady(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      await fetch(url, { redirect: 'manual' })
      return
    } catch {
      await sleep(READY_POLL_MS)
    }
  }
  throw new Error(`Timed out waiting for ${url}`)
}

export function hasProductionBuild() {
  return existsSync('.next')
}

export async function ensureProdServer() {
  if (await isPortOpen(DEV_SERVER_PORT)) {
    return { stop() {} }
  }
  const child = spawn('npm', ['run', 'start', '--', '-p', String(DEV_SERVER_PORT)], {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_SSL_REJECT_UNAUTHORIZED: 'false',
      NODE_OPTIONS: process.env.NODE_OPTIONS ?? NODE_HEAP,
    },
  })
  let exitCode = null
  child.on('exit', code => {
    exitCode = code
  })
  try {
    await waitForReady(LOCAL_BASE_URL, READY_TIMEOUT_MS)
  } catch (error) {
    child.kill('SIGTERM')
    if (exitCode !== null) {
      throw new Error(`Production server exited ${exitCode} before ready`)
    }
    throw error
  }
  return {
    stop() {
      child.kill('SIGTERM')
    },
  }
}
