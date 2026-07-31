#!/usr/bin/env node
/**
 * Lightweight Mastra smoke for agent handover.
 * Checks file-based agent folders + Studio index; optionally probes running Studio.
 *
 * Usage:
 *   node scripts/mastra-smoke.mjs
 *   node scripts/mastra-smoke.mjs --hook   # JSON { ok, user_message }
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const hook = process.argv.includes('--hook')
const root = process.cwd()
const agentsRoot = join(root, 'src/mastra/agents')
const studioIndex = join(root, '.mastra/output/studio/index.html')
const mastraEntry = join(root, 'src/mastra.ts')
const mastraShim = join(root, 'src/mastra/index.ts')

const problems = []

function ok(msg) {
  if (hook) {
    process.stdout.write(JSON.stringify({ ok: true, user_message: msg }) + '\n')
  } else {
    console.log(msg)
  }
  process.exit(0)
}

function fail(lines) {
  const user_message = lines.join('\n')
  if (hook) {
    process.stdout.write(JSON.stringify({ ok: false, user_message }) + '\n')
    process.exit(0)
  }
  console.error(user_message)
  process.exit(1)
}

if (!existsSync(mastraEntry)) {
  problems.push(`missing Studio entry: src/mastra.ts`)
}
if (!existsSync(mastraShim)) {
  problems.push(`missing CLI shim: src/mastra/index.ts`)
}

if (!existsSync(agentsRoot)) {
  problems.push(`missing file-based agents dir: src/mastra/agents`)
} else {
  const dirs = readdirSync(agentsRoot).filter((name) => {
    try {
      return statSync(join(agentsRoot, name)).isDirectory()
    } catch {
      return false
    }
  })
  for (const id of dirs) {
    const dir = join(agentsRoot, id)
    const instructions = join(dir, 'instructions.md')
    const config = join(dir, 'config.ts')
    // Shared folders (e.g. constants/) are not agents — only validate agent packages.
    if (!existsSync(instructions) && !existsSync(config)) {
      continue
    }
    if (existsSync(config) && !existsSync(instructions)) {
      problems.push(`agent "${id}": config.ts present but instructions.md missing`)
    }
    if (existsSync(config)) {
      const text = readFileSync(config, 'utf8')
      if (!/export\s+(const|default|async)/.test(text)) {
        problems.push(`agent "${id}": config.ts has no export`)
      }
    }
  }
}

if (!existsSync(studioIndex)) {
  problems.push(
    'Studio UI missing: .mastra/output/studio/index.html — run `npm run mastra:build` (includes --studio)',
  )
}

// Optional live probe — never fail the smoke solely because Studio isn't running.
let studioHint = ''
try {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), 800)
  const res = await fetch('http://127.0.0.1:4111/', { signal: ac.signal })
  clearTimeout(t)
  studioHint = res.ok
    ? 'Studio responding on :4111'
    : `Studio :4111 returned HTTP ${res.status}`
} catch {
  studioHint = 'Studio not running on :4111 (ok — build artifacts checked)'
}

if (problems.length) {
  fail([
    `Mastra smoke: ${problems.length} issue(s)`,
    ...problems.map((p) => `• ${p}`),
    studioHint,
  ])
}

ok(`Mastra smoke clean · ${studioHint}`)
