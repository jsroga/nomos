#!/usr/bin/env node
/**
 * Run the local stack: Next.js (:3000) + Mastra Studio (:4111) + Trigger.dev.
 *
 * Usage: npm run dev:stack
 *
 * If a stack port is taken, frees it and retries that service once.
 * Ctrl+C stops all three. Critical (Next) exit stops the others.
 */

import { spawn, execFileSync } from 'node:child_process'

const RESET = '\x1b[0m'
const DIM = '\x1b[2m'

const PORTS = {
  next: 3000,
  mastra: 4111,
}

const SERVICES = [
  { name: 'next', script: 'dev:turbo', color: '\x1b[36m', critical: true, port: PORTS.next },
  { name: 'mastra', script: 'mastra:dev', color: '\x1b[35m', critical: false, port: PORTS.mastra },
  { name: 'trigger', script: 'trigger:dev', color: '\x1b[33m', critical: false, port: null },
]

const EADDRINUSE_RE =
  /(?:EADDRINUSE|address already in use).*?(?:[:\s]|:::)(\d{2,5})\b|port (\d{2,5}) (?:is )?already in use/i
const MAX_PORT_RETRIES = 1

const children = []
const retryCountByName = new Map()
let shuttingDown = false

function log(message) {
  console.error(`${DIM}[dev:stack]${RESET} ${message}`)
}

function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function pidsListeningOn(port) {
  try {
    const out = execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return out
      .split(/\s+/)
      .map(s => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter(n => Number.isFinite(n) && n > 0)
  } catch {
    return []
  }
}

function freePort(port) {
  const pids = pidsListeningOn(port).filter(pid => pid !== process.pid)
  if (pids.length === 0) return false
  log(`port ${port} in use by pid ${pids.join(', ')} — killing`)
  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      // already gone
    }
  }
  const deadline = Date.now() + 2_000
  while (Date.now() < deadline) {
    if (pidsListeningOn(port).length === 0) return true
    sleepMs(100)
  }
  for (const pid of pidsListeningOn(port).filter(p => p !== process.pid)) {
    try {
      process.kill(pid, 'SIGKILL')
    } catch {
      // already gone
    }
  }
  return true
}

function freeStackPorts() {
  for (const port of Object.values(PORTS)) freePort(port)
}

function prefixLine(name, color, chunk, stream) {
  const text = chunk.toString()
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (line.length === 0 && i === lines.length - 1) continue
    stream.write(`${color}[${name}]${RESET} ${line}\n`)
  }
}

function stopAll(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM')
  }
  setTimeout(() => {
    for (const child of children) {
      if (!child.killed) child.kill('SIGKILL')
    }
    process.exit(code)
  }, 4_000).unref()
}

function parsePortFromEaddrInUse(text) {
  const match = EADDRINUSE_RE.exec(text)
  if (!match) return null
  const port = Number(match[1] ?? match[2])
  return Number.isFinite(port) ? port : null
}

function detachChild(child) {
  const idx = children.indexOf(child)
  if (idx >= 0) children.splice(idx, 1)
  child.stdout?.removeAllListeners('data')
  child.stderr?.removeAllListeners('data')
  child.removeAllListeners('exit')
}

function maybeRetryOnEaddrInUse(service, child, text, eaddrState) {
  if (eaddrState.handled || shuttingDown) return
  const busyPort = parsePortFromEaddrInUse(text)
  if (busyPort === null) return

  const retries = retryCountByName.get(service.name) ?? 0
  if (retries >= MAX_PORT_RETRIES) return

  eaddrState.handled = true
  retryCountByName.set(service.name, retries + 1)
  const targetPort = busyPort ?? service.port
  log(`${service.name}: EADDRINUSE — freeing ${targetPort ?? 'port'} and retrying`)
  if (targetPort) freePort(targetPort)
  detachChild(child)
  try {
    child.kill('SIGTERM')
  } catch {
    // ignore
  }
  setTimeout(() => {
    if (!shuttingDown) start(service)
  }, 400)
}

function start(service) {
  const { name, script, color, critical } = service
  const child = spawn('npm', ['run', script], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: false,
  })
  children.push(child)

  const eaddrState = { handled: false }

  child.stdout?.on('data', chunk => {
    prefixLine(name, color, chunk, process.stdout)
    maybeRetryOnEaddrInUse(service, child, chunk.toString(), eaddrState)
  })
  child.stderr?.on('data', chunk => {
    prefixLine(name, color, chunk, process.stderr)
    maybeRetryOnEaddrInUse(service, child, chunk.toString(), eaddrState)
  })

  child.on('exit', (code, signal) => {
    if (shuttingDown || eaddrState.handled) return
    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`
    if (critical) {
      log(`${name} exited (${reason}) — stopping stack`)
      stopAll(code && code !== 0 ? code : 1)
      return
    }
    log(`${name} exited (${reason}) — Next keeps running (restart that service alone if needed)`)
  })
}

freeStackPorts()
log('starting Next turbopack (:3000) · Mastra Studio (:4111) · Trigger.dev')
for (const service of SERVICES) start(service)

process.on('SIGINT', () => stopAll(0))
process.on('SIGTERM', () => stopAll(0))
