#!/usr/bin/env node
/**
 * Local quality backlog — capture gate results once, fix one-by-one, rescan every N steps.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { changedTsFiles, runFastGate } from './fast.mjs'

const BACKLOG_MD = '.local/quality-backlog.md'
const LAST_RUN_JSON = '.local/quality-last-run.json'

function ensureLocalDir() {
  mkdirSync('.local', { recursive: true })
}

function parseBacklogArgs(argv) {
  const opts = { command: 'show', ids: [], files: [], changed: false }
  const rest = [...argv]
  if (rest[0] === 'capture') {
    opts.command = 'capture'
    rest.shift()
  } else if (rest[0] === 'done') {
    opts.command = 'done'
    rest.shift()
    while (rest[0] && !rest[0].startsWith('--')) opts.ids.push(rest.shift())
  } else if (rest[0] === 'show' || rest[0] === 'status') {
    opts.command = 'show'
    rest.shift()
  }

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]
    if (arg === '--changed') opts.changed = true
    else if (arg === '--files') {
      while (rest[i + 1] && !rest[i + 1].startsWith('--')) opts.files.push(rest[++i])
    } else if (!arg.startsWith('--') && /\.(ts|tsx)$/.test(arg)) {
      opts.files.push(arg)
    }
  }
  return opts
}

function fingerprint(item) {
  return createHash('sha1').update(`${item.file}|${item.line}|${item.kind}|${item.message}`).digest('hex').slice(0, 8)
}

function loadLastRun() {
  if (!existsSync(LAST_RUN_JSON)) {
    return { capturedAt: null, files: [], items: [], fixStepsSinceCapture: 0 }
  }
  try {
    return JSON.parse(readFileSync(LAST_RUN_JSON, 'utf8'))
  } catch {
    return { capturedAt: null, files: [], items: [], fixStepsSinceCapture: 0 }
  }
}

function saveLastRun(state) {
  ensureLocalDir()
  writeFileSync(LAST_RUN_JSON, `${JSON.stringify(state, null, 2)}\n`)
}

function renderMarkdown(state) {
  const open = state.items.filter((i) => !i.done)
  const done = state.items.filter((i) => i.done)
  const lines = [
    '# Quality backlog',
    '',
    `Last capture: ${state.capturedAt ?? 'never'} · files: ${state.files.length} · open: ${open.length} · fixed: ${done.length} · fix-steps since capture: ${state.fixStepsSinceCapture ?? 0}`,
    '',
    '**Cadence:** fix one item → `npm run qualitygate:backlog -- done <id>` → rescan every **5** fixes via `npm run qualitygate:capture`.',
    '',
    '## Next up',
    '',
  ]

  if (!open.length) {
    lines.push('_No open items — run `npm run qualitygate:capture` after edits or before handoff._', '')
  } else {
    for (const item of open.slice(0, 40)) {
      const loc = item.line ? `${item.file}:${item.line}` : item.file
      lines.push(`- [ ] **${item.id}** \`${loc}\` **${item.kind}** — ${item.message}`)
    }
    if (open.length > 40) lines.push(`- … and ${open.length - 40} more (see ${LAST_RUN_JSON})`, '')
    lines.push('')
  }

  if (done.length) {
    lines.push('## Fixed (this session)', '')
    for (const item of done.slice(-20)) {
      const loc = item.line ? `${item.file}:${item.line}` : item.file
      lines.push(`- [x] **${item.id}** \`${loc}\` — ${item.message}`)
    }
    lines.push('')
  }

  return `${lines.join('\n')}\n`
}

function writeBacklog(state) {
  ensureLocalDir()
  writeFileSync(BACKLOG_MD, renderMarkdown(state))
}

export function captureBacklog(opts) {
  if (!opts.changed && !opts.files.length) opts.changed = true
  const files = opts.changed ? changedTsFiles() : opts.files
  const gate = runFastGate({ files, changed: false, fromMarker: false, hookMode: false })

  const items = gate.issues.map((issue) => ({ ...issue, done: false, id: fingerprint(issue) }))
  const prev = loadLastRun()
  const doneIds = new Set(prev.items.filter((i) => i.done).map((i) => i.id))
  for (const item of items) {
    if (doneIds.has(item.id)) item.done = true
  }

  const state = {
    capturedAt: new Date().toISOString(),
    files,
    exitCode: gate.ok ? 0 : 1,
    summary: gate.summary,
    items,
    fixStepsSinceCapture: 0,
  }
  saveLastRun(state)
  writeBacklog(state)

  const open = items.filter((i) => !i.done).length
  console.log(`qualitygate:capture · ${files.length} file(s) · ${items.length} item(s) · ${open} open`)
  if (open > 0) {
    console.log(`  → read ${BACKLOG_MD}`)
    console.log('  → fix ONE item, then: npm run qualitygate:backlog -- done <id>')
    console.log('  → rescan every 5 fixes: npm run qualitygate:capture')
  }
  return gate.ok && open === 0 ? 0 : 1
}

export function markBacklogDone(ids) {
  const state = loadLastRun()
  if (!state.items?.length) {
    console.error('qualitygate:backlog — nothing captured; run npm run qualitygate:capture first')
    process.exit(1)
  }
  const idSet = new Set(ids)
  let marked = 0
  for (const item of state.items) {
    if (idSet.has(String(item.id)) || idSet.has(String(state.items.indexOf(item) + 1))) {
      item.done = true
      marked += 1
    }
  }
  state.fixStepsSinceCapture = (state.fixStepsSinceCapture ?? 0) + marked
  saveLastRun(state)
  writeBacklog(state)
  const open = state.items.filter((i) => !i.done).length
  console.log(`qualitygate:backlog · marked ${marked} done · ${open} open · ${state.fixStepsSinceCapture} fixes since capture`)
  if (state.fixStepsSinceCapture >= 5 && open > 0) {
    console.log('  → 5+ fixes since capture — run: npm run qualitygate:capture')
  }
}

export function showBacklog() {
  if (!existsSync(BACKLOG_MD)) {
    console.log('qualitygate:backlog — empty; run: npm run qualitygate:capture')
    return
  }
  console.log(readFileSync(BACKLOG_MD, 'utf8'))
  const state = loadLastRun()
  const open = state.items?.filter((i) => !i.done).length ?? 0
  if (open > 0 && (state.fixStepsSinceCapture ?? 0) >= 5) {
    console.log('\n(hint: 5+ fixes since last capture — refresh with npm run qualitygate:capture)')
  }
}

export function main(argv = process.argv.slice(2)) {
  const opts = parseBacklogArgs(argv)
  if (opts.command === 'capture') process.exit(captureBacklog(opts))
  if (opts.command === 'done') markBacklogDone(opts.ids)
  else showBacklog()
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
