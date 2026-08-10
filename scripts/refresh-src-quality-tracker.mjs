#!/usr/bin/env node
/**
 * Regenerate `.local/SRC-QUALITY-TRACKER.md` — TSC + magic-string status per file.
 * Output stays gitignored under `.local/` (not a repo-root tracker md).
 *
 * FAST (use these while fixing):
 *   node scripts/refresh-src-quality-tracker.mjs --file src/path/file.ts   (~5s, one row)
 *   node scripts/refresh-src-quality-tracker.mjs --skip-tsc                 (~30s, eslint only)
 *
 * SLOW (explicit only):
 *   node scripts/refresh-src-quality-tracker.mjs --bootstrap-tsc             (~5 min, all slices)
 */
import { execSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const NODE_OPTS = process.env.NODE_OPTIONS ?? '--max-old-space-size=4096'
const OUT = '.local/SRC-QUALITY-TRACKER.md'
const STATE_PATH = '.local/quality-tracker-state.json'

const EXEMPT_PATTERNS = [
  /[/\\]Enums\.ts$/,
  /[/\\]enums\.ts$/,
  /-wire\.ts$/,
  /[/\\]constants[/\\]/,
  /[/\\]agent-schemas\.ts$/,
  /-schema\.ts$/,
  /[/\\]schemas\.ts$/,
  /-scorer\.ts$/,
  /[/\\]domains[/\\][^/\\]+[/\\]prompts[/\\]/,
  /[/\\]domains[/\\][^/\\]+[/\\]agents[/\\]/,
  /[/\\]agents[/\\].*[/\\]tools[/\\]/,
  /[/\\]mcp[/\\]domains[/\\][^/\\]+[/\\]tools\.ts$/,
  /[/\\]domains[/\\][^/\\]+[/\\]tasks[/\\].+\.task\.ts$/,
  /[/\\]db[/\\]schema\.ts$/,
  /[/\\]shared[/\\]agent-kernel[/\\]mastra[/\\]tools[/\\]/,
  /[/\\]shared[/\\]agent-kernel[/\\]prompts[/\\]/,
  /[/\\]shared[/\\]agent-kernel[/\\]models\.ts$/,
  /[/\\]shared[/\\]ai[/\\]rag[/\\]/,
  /[/\\]shared[/\\]ai[/\\]contextAssembler/,
  /\.d\.ts$/,
]

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
}

function listSrcFiles() {
  const out = sh("git ls-files 'src/**/*.ts' 'src/**/*.tsx'")
  return out
    .split('\n')
    .map((f) => f.trim())
    .filter((f) => /\.(ts|tsx)$/.test(f))
    .sort()
}

function isExempt(filePath) {
  const normalized = filePath.replace(/\\/g, '/')
  return EXEMPT_PATTERNS.some((p) => p.test(normalized))
}

function toRepoPath(filePath) {
  const cwd = process.cwd()
  const normalized = filePath.replace(/\\/g, '/')
  if (normalized.startsWith(cwd)) return normalized.slice(cwd.length + 1)
  return normalized.replace(/^\.\//, '')
}

function parseArgs(argv) {
  const opts = { file: null, skipTsc: false, bootstrapTsc: false, writeOnly: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--skip-tsc') opts.skipTsc = true
    else if (arg === '--bootstrap-tsc') opts.bootstrapTsc = true
    else if (arg === '--write') opts.writeOnly = true
    else if (arg === '--file') opts.file = argv[++i]
    else if (!arg.startsWith('--') && /\.(ts|tsx)$/.test(arg)) opts.file = arg
  }
  return opts
}

function defaultEntry() {
  return { tsc: null, magic: null, eslint: null, notes: [], updatedAt: null }
}

function loadState(files) {
  const entries = {}
  for (const file of files) entries[file] = defaultEntry()

  if (!existsSync(STATE_PATH)) return { generatedAt: null, files: entries }

  try {
    const parsed = JSON.parse(readFileSync(STATE_PATH, 'utf8'))
    for (const file of files) {
      entries[file] = { ...defaultEntry(), ...(parsed.files?.[file] ?? {}) }
    }
    return { generatedAt: parsed.generatedAt ?? null, files: entries }
  } catch {
    return { generatedAt: null, files: entries }
  }
}

function saveState(state) {
  mkdirSync('.local', { recursive: true })
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`)
}

function runTypecheckJson(args) {
  const result = spawnSync('node', ['scripts/typecheck-scoped.mjs', ...args, '--json'], {
    encoding: 'utf8',
    env: { ...process.env, NODE_OPTIONS: NODE_OPTS },
    maxBuffer: 128 * 1024 * 1024,
  })
  const combined = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  const line = combined.split('\n').find((l) => l.trim().startsWith('{') && l.includes('"errors"'))
  if (!line) return { errors: [], byFile: {} }
  try {
    const parsed = JSON.parse(line)
    const byFile = {}
    for (const e of parsed.errors ?? []) {
      const rel = toRepoPath(e.file)
      byFile[rel] = (byFile[rel] ?? 0) + 1
    }
    return { errors: parsed.errors ?? [], byFile }
  } catch {
    return { errors: [], byFile: {} }
  }
}

function eslintForFiles(files) {
  if (!files.length) return { magic: {}, eslint: {} }
  const result = spawnSync('npx', ['eslint', ...files, '-f', 'json'], {
    encoding: 'utf8',
    env: { ...process.env, NODE_OPTIONS: NODE_OPTS },
    maxBuffer: 64 * 1024 * 1024,
  })
  let data
  try {
    data = JSON.parse(result.stdout || '[]')
  } catch {
    return { magic: {}, eslint: {} }
  }

  const magic = {}
  const eslint = {}
  const cwd = process.cwd()
  for (const fileResult of data) {
    const rel = toRepoPath(fileResult.filePath.replace(cwd + '/', '').replace(cwd + '\\', ''))
    let magicCount = 0
    let eslintCount = 0
    for (const m of fileResult.messages) {
      if (m.severity < 2) continue
      eslintCount++
      if (m.ruleId === 'local/no-magic-string') magicCount++
    }
    if (magicCount) magic[rel] = magicCount
    if (eslintCount) eslint[rel] = eslintCount
  }
  return { magic, eslint }
}

function eslintCountsAll() {
  console.log('refresh-tracker: eslint on src/ (~30s)…')
  const result = spawnSync('npx', ['eslint', 'src', '-f', 'json'], {
    encoding: 'utf8',
    env: { ...process.env, NODE_OPTIONS: NODE_OPTS },
    maxBuffer: 128 * 1024 * 1024,
  })
  let data
  try {
    data = JSON.parse(result.stdout || '[]')
  } catch {
    console.warn('refresh-tracker: eslint JSON parse failed')
    return { magic: {}, eslint: {} }
  }

  const magic = {}
  const eslint = {}
  const cwd = process.cwd()
  for (const fileResult of data) {
    const rel = toRepoPath(fileResult.filePath.replace(cwd + '/', '').replace(cwd + '\\', ''))
    let magicCount = 0
    let eslintCount = 0
    for (const m of fileResult.messages) {
      if (m.severity < 2) continue
      eslintCount++
      if (m.ruleId === 'local/no-magic-string') magicCount++
    }
    if (magicCount) magic[rel] = magicCount
    if (eslintCount) eslint[rel] = eslintCount
  }
  return { magic, eslint }
}

function tscCountForFile(file, errors) {
  return errors.filter((e) => toRepoPath(e.file) === file).length
}

function applyTscBootstrap(state, byFile, allErrors) {
  const now = new Date().toISOString()
  for (const file of Object.keys(state.files)) {
    if (isExempt(file)) continue
    const count = byFile[file] ?? tscCountForFile(file, allErrors)
    state.files[file].tsc = count
    state.files[file].updatedAt = now
  }
}

function checkOneFile(state, file) {
  const t0 = Date.now()
  const { errors } = runTypecheckJson(['--files', file])
  const { magic, eslint } = eslintForFiles([file])
  const ms = Date.now() - t0

  const entry = state.files[file]
  entry.tsc = tscCountForFile(file, errors)
  entry.magic = magic[file] ?? 0
  entry.eslint = eslint[file] ?? 0
  entry.updatedAt = new Date().toISOString()
  state.generatedAt = entry.updatedAt

  console.log(
    `refresh-tracker: ${file} — TSC ${entry.tsc === 0 ? 'clean' : `${entry.tsc} err`} · MagicStr ${entry.magic === 0 ? 'clean' : `${entry.magic} viol`} (${(ms / 1000).toFixed(1)}s)`,
  )
}

function statusTsc(count, exempt) {
  if (exempt) return 'exempt'
  if (count === null || count === undefined) return 'pending'
  if (count === 0) return 'clean'
  return `${count} err`
}

function statusMagic(count, exempt) {
  if (exempt) return 'exempt'
  if (count === null || count === undefined) return 'pending'
  if (count === 0) return 'clean'
  return `${count} viol`
}

function writeMarkdown(state, files) {
  let tscClean = 0
  let tscErr = 0
  let tscPending = 0
  let tscExempt = 0
  let msClean = 0
  let msErr = 0
  let msPending = 0
  let msExempt = 0

  const rows = []
  for (const file of files) {
    const exempt = isExempt(file)
    const e = state.files[file]
    const tsc = statusTsc(e.tsc, exempt)
    const ms = statusMagic(e.magic, exempt)
    const notes = []
    if (exempt) notes.push('wire/schema')
    if (e.eslint && !e.magic) notes.push(`eslint ${e.eslint}`)

    if (exempt) {
      tscExempt++
      msExempt++
    } else if (tsc === 'pending') tscPending++
    else if (tsc === 'clean') tscClean++
    else tscErr++

    if (!exempt) {
      if (ms === 'pending') msPending++
      else if (ms === 'clean') msClean++
      else msErr++
    }

    rows.push(`| \`${file}\` | ${tsc} | ${ms} | ${notes.join('; ') || '—'} |`)
  }

  const now = (state.generatedAt ?? new Date().toISOString()).slice(0, 19).replace('T', ' ')
  const header = `# src/ quality tracker

Generated: ${now} · **${files.length} files** in \`src/**\`

| Metric | clean | errors | pending | exempt |
|--------|------:|-------:|--------:|-------:|
| TSC | ${tscClean} | ${tscErr} | ${tscPending} | ${tscExempt} |
| MagicStr | ${msClean} | ${msErr} | ${msPending} | ${msExempt} |

## Fix loop (fast — ~5s per file)

1. Fix file
2. \`npm run qualitygate:file -- src/path/file.ts\` — validate (TSC + ESLint + metrics)
3. \`npm run qualitygate:tracker -- --file src/path/file.ts\` — update this row

## Bulk refresh

| Command | Time | What |
|---------|------|------|
| \`npm run qualitygate:tracker -- --skip-tsc\` | ~30s | ESLint/magic-string counts for all files |
| \`npm run qualitygate:tracker -- --file <path>\` | ~5s | TSC + magic-string for **one** file |
| \`npm run qualitygate:tracker -- --skip-tsc -- --bootstrap-tsc\` | ~5 min | TSC baseline (run once, not per fix) |

State: \`.local/quality-tracker-state.json\`

| File | TSC | MagicStr | Notes |
|------|-----|----------|-------|
`

  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, header + rows.join('\n') + '\n')
  console.log(`refresh-tracker: wrote ${OUT} (${files.length} rows)`)
  console.log(
    `  TSC: ${tscClean} clean / ${tscErr} err / ${tscPending} pending / ${tscExempt} exempt`,
  )
  console.log(
    `  MagicStr: ${msClean} clean / ${msErr} viol / ${msPending} pending / ${msExempt} exempt`,
  )
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  const files = listSrcFiles()
  const state = loadState(files)

  if (opts.writeOnly) {
    writeMarkdown(state, files)
    return
  }

  if (opts.file) {
    const rel = opts.file.replace(/^\.\//, '')
    if (!state.files[rel]) {
      console.error(`refresh-tracker: not a tracked src file: ${rel}`)
      process.exit(2)
    }
    checkOneFile(state, rel)
    saveState(state)
    writeMarkdown(state, files)
    return
  }

  if (opts.bootstrapTsc) {
    console.log('refresh-tracker: TSC bootstrap via --all-slices (slow — explicit only)…')
    const { errors, byFile } = runTypecheckJson(['--all-slices'])
    applyTscBootstrap(state, byFile, errors)
    state.generatedAt = new Date().toISOString()
  } else if (!opts.skipTsc) {
    console.log('refresh-tracker: skipping TSC (use --file or --bootstrap-tsc). Running eslint only.')
    opts.skipTsc = true
  }

  if (opts.skipTsc || opts.bootstrapTsc) {
    const { magic, eslint } = eslintCountsAll()
    const now = new Date().toISOString()
    for (const file of files) {
      if (isExempt(file)) continue
      state.files[file].magic = magic[file] ?? 0
      state.files[file].eslint = eslint[file] ?? 0
    }
    state.generatedAt = now
  }

  saveState(state)
  writeMarkdown(state, files)
}

main()
