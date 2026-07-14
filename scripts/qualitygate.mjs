#!/usr/bin/env node
/**
 * Unified quality gate CLI.
 */
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { parseFastArgs, runFastGate, printFastGateResult } from './qualitygate/fast.mjs'
import { captureBacklog, markBacklogDone, showBacklog } from './qualitygate/backlog.mjs'

const NODE_OPTS = process.env.NODE_OPTIONS ?? '--max-old-space-size=6144'

function runNode(script, args) {
  const result = spawnSync('node', [script, ...args], {
    encoding: 'utf8',
    env: { ...process.env, NODE_OPTIONS: NODE_OPTS },
    stdio: 'inherit',
    maxBuffer: 64 * 1024 * 1024,
  })
  process.exit(result.status ?? 0)
}

function parseCaptureArgs(argv) {
  const opts = { files: [], changed: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--changed') opts.changed = true
    else if (arg === '--files') {
      while (argv[i + 1] && !argv[i + 1].startsWith('--')) opts.files.push(argv[++i])
    } else if (!arg.startsWith('--') && /\.(ts|tsx)$/.test(arg)) {
      opts.files.push(arg)
    }
  }
  if (!opts.changed && !opts.files.length) opts.changed = true
  return opts
}

function usage() {
  console.log(`qualitygate commands:
  file <path…> [--hook]           TSC + ESLint + metrics on files
  changed [--hook] [--from-marker]   gate on git-changed src/**
  capture [--changed] [path…]      → .local/quality-backlog.md
  backlog                          show backlog
  backlog done <id…>               mark fixed
  metrics                          full src/ scan
  tsc …                            passthrough to typecheck-scoped.mjs
  tracker …                        passthrough to refresh-src-quality-tracker.mjs`)
}

function main() {
  const [command, ...rest] = process.argv.slice(2)

  if (command === 'file') {
    const opts = parseFastArgs(rest)
    const result = runFastGate(opts)
    process.exit(printFastGateResult(result, { hookMode: opts.hookMode }))
  }

  if (command === 'changed') {
    const opts = parseFastArgs([...rest, '--changed'])
    const result = runFastGate(opts)
    process.exit(printFastGateResult(result, { hookMode: opts.hookMode }))
  }

  if (command === 'capture') {
    process.exit(captureBacklog(parseCaptureArgs(rest)))
  }

  if (command === 'backlog') {
    if (rest[0] === 'done') {
      markBacklogDone(rest.slice(1))
      return
    }
    showBacklog()
    return
  }

  if (command === 'metrics') {
    runNode('scripts/check-code-metrics.mjs', rest)
    return
  }

  if (command === 'tsc') {
    runNode('scripts/typecheck-scoped.mjs', rest)
    return
  }

  if (command === 'tracker') {
    runNode('scripts/refresh-src-quality-tracker.mjs', rest)
    return
  }

  if (command === 'help' || command === '--help' || command === '-h') {
    usage()
    return
  }

  usage()
  process.exit(command ? 1 : 0)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
