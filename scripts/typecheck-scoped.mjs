#!/usr/bin/env node
/**
 * Scoped TypeScript check — avoids full-repo OOM.
 *
 *   node scripts/typecheck-scoped.mjs --files src/foo.ts
 *   node scripts/typecheck-scoped.mjs --module storyteller
 *   node scripts/typecheck-scoped.mjs --changed
 *   node scripts/typecheck-scoped.mjs --all-slices
 *   node scripts/typecheck-scoped.mjs --all-slices --json
 */
import { randomBytes } from 'node:crypto'
import { execSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const NODE_OPTS = process.env.NODE_OPTIONS ?? '--max-old-space-size=6144'
const LEGACY_TSCONFIG = 'tsconfig.scoped.json'
/** Stale file from incremental scoped runs — must not be reused across slices (causes OOM/hangs). */
const LEGACY_TSC_BUILDINFO = 'tsconfig.scoped.tsbuildinfo'
const TSC_BIN = process.env.TSC_BIN ?? join(process.cwd(), 'node_modules/typescript/bin/tsc')
const LOG_PATH = '.local/typecheck-latest.log'
const FILES_CHUNK_SIZE = 8
const MODULE_SUBDIR_CHUNK = 5

const DOMAIN_MODULES = [
  'storyteller',
  'chat',
  '3d-canvas',
  'loop-creator',
  'marketing',
  'deduction-puzzle-designer',
  '3d-asset-exporter',
  'game-design',
  '2d-canvas',
]

const SLICES = [
  { id: 'shared', include: ['src/shared/**/*.ts', 'src/shared/**/*.tsx'] },
  { id: 'components', include: ['src/components/**/*.ts', 'src/components/**/*.tsx'] },
  { id: 'db', include: ['src/db/**/*.ts', 'src/db/**/*.tsx'] },
  { id: 'trigger', include: ['src/trigger/**/*.ts', 'src/trigger/**/*.tsx'] },
  { id: 'mcp', include: ['src/mcp/**/*.ts', 'src/mcp/**/*.tsx'] },
  { id: 'app-workspace', include: ['src/app/(workspace)/**/*.ts', 'src/app/(workspace)/**/*.tsx'] },
  {
    id: 'app-shell',
    include: [
      'src/app/layout.tsx',
      'src/app/global-error.tsx',
      'src/app/(marketing)/**/*.ts',
      'src/app/(marketing)/**/*.tsx',
      'src/app/(auth)/**/*.ts',
      'src/app/(auth)/**/*.tsx',
      'src/app/documentation/**/*.ts',
      'src/app/documentation/**/*.tsx',
      'src/instrumentation.ts',
      'src/instrumentation-client.ts',
      'src/proxy.ts',
      'src/mastra.ts',
    ],
  },
  { id: 'app-api-storyteller', include: ['src/app/api/storyteller/**/*.ts', 'src/app/api/storyteller/**/*.tsx'] },
  { id: 'app-api-entities', include: ['src/app/api/entities/**/*.ts', 'src/app/api/entities/**/*.tsx'] },
  { id: 'app-api-world', include: ['src/app/api/world/**/*.ts', 'src/app/api/world/**/*.tsx'] },
  { id: 'app-api-interior', include: ['src/app/api/3d-canvas/**/*.ts', 'src/app/api/3d-canvas/**/*.tsx'] },
  { id: 'app-api-trigger', include: ['src/app/api/trigger*/**/*.ts', 'src/app/api/trigger*/**/*.tsx'] },
  { id: 'app-api-auth', include: ['src/app/api/auth/**/*.ts', 'src/app/api/auth/**/*.tsx'] },
  { id: 'app-api-rest', include: ['src/app/api/**/*.ts', 'src/app/api/**/*.tsx'] },
  ...DOMAIN_MODULES.map((name) => ({
    id: `domain-${name}`,
    // Domain only — API routes live in app-api-* slices; bundling them here duplicates
    // work and can OOM (e.g. loop-creator chat route + full agent graph).
    include: [`src/domains/${name}/**/*.ts`, `src/domains/${name}/**/*.tsx`],
  })),
]

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
}

function parseArgs(argv) {
  const opts = {
    files: [],
    module: null,
    changed: false,
    allSlices: false,
    json: false,
    fromMarker: false,
    markerPath: null,
    failOnOutside: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--files') {
      while (argv[i + 1] && !argv[i + 1].startsWith('--')) {
        opts.files.push(argv[++i])
      }
    } else if (arg === '--module') {
      opts.module = argv[++i]
    } else if (arg === '--changed') {
      opts.changed = true
    } else if (arg === '--all-slices') {
      opts.allSlices = true
    } else if (arg === '--json') {
      opts.json = true
    } else if (arg === '--from-marker') {
      opts.fromMarker = true
    } else if (arg === '--marker') {
      opts.markerPath = argv[++i]
    } else if (arg === '--fail-on-outside') {
      opts.failOnOutside = true
    } else if (!arg.startsWith('--') && /\.(ts|tsx)$/.test(arg)) {
      opts.files.push(arg)
    }
  }

  return opts
}

function markerPathForCwd() {
  const root = sh('git rev-parse --show-toplevel 2>/dev/null || pwd').trim()
  const hash = sh(`echo "${root}" | shasum | cut -c1-12`).trim()
  const dir = process.env.TMPDIR ?? '/tmp'
  return `${dir}/cursor-edited-src.${hash}`
}

function readMarker(path) {
  if (!existsSync(path)) return []
  try {
    const lines = sh(`cat "${path}"`).split('\n').map((l) => l.trim()).filter(Boolean)
    return [...new Set(lines)].filter((f) => f.startsWith('src/') && /\.(ts|tsx)$/.test(f))
  } catch {
    return []
  }
}

function changedTsFiles() {
  const parts = []
  try {
    const base = sh('git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main 2>/dev/null || true').trim()
    if (base) {
      parts.push(sh(`git diff --name-only --diff-filter=ACMR ${base}...HEAD`))
    }
  } catch {
    /* empty */
  }
  try {
    parts.push(sh('git diff --name-only --diff-filter=ACMR HEAD'))
    parts.push(sh('git ls-files --others --exclude-standard'))
  } catch {
    /* empty */
  }
  return [
    ...new Set(
      parts
        .join('\n')
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f.startsWith('src/') && /\.(ts|tsx)$/.test(f)),
    ),
  ]
}

function isAggregateEntry(file) {
  return (
    file.endsWith('/server.ts') ||
    file.endsWith('/index.ts') ||
    file.endsWith('/index.tsx')
  )
}

function listModuleTsFiles(module) {
  try {
    const out = sh(
      `find src/domains/${module} \\( -name '*.ts' -o -name '*.tsx' \\) | sort`,
    ).trim()
    const files = out ? out.split('\n').filter(Boolean) : []
    // Barrel/server entrypoints re-export the whole module — checking them as roots
    // duplicates the graph and can OOM; leaf files are covered by subdir chunks.
    return files.filter((f) => !isAggregateEntry(f))
  } catch {
    return []
  }
}

/** --module runs: chunk by subdir + file count (single globs OOM on agent-heavy modules). */
function moduleSlices(module) {
  if (module === 'src-root') {
    const files = changedTsFiles()
    return [{ id: 'src-root', include: files }]
  }

  const base = `src/domains/${module}`
  if (!existsSync(base)) {
    throw new Error(`Unknown module: ${module}`)
  }

  const allFiles = listModuleTsFiles(module)
  if (!allFiles.length) {
    throw new Error(`No TS files in module: ${module}`)
  }

  const slices = []
  const rootFiles = allFiles.filter((f) => !f.slice(base.length + 1).includes('/'))
  if (rootFiles.length) {
    const chunks = chunkArray(rootFiles, MODULE_SUBDIR_CHUNK)
    chunks.forEach((chunk, i) => {
      slices.push({
        id: chunks.length === 1 ? `domain-${module}-root` : `domain-${module}-root-${i + 1}`,
        include: chunk,
      })
    })
  }

  for (const subdir of readdirSync(base).sort()) {
    const subPath = join(base, subdir)
    try {
      if (!statSync(subPath).isDirectory()) continue
    } catch {
      continue
    }
    const prefix = `${subPath}/`
    const subFiles = allFiles.filter((f) => f.startsWith(prefix))
    if (!subFiles.length) continue
    const chunks = chunkArray(subFiles, MODULE_SUBDIR_CHUNK)
    chunks.forEach((chunk, i) => {
      slices.push({
        id:
          chunks.length === 1
            ? `domain-${module}-${subdir}`
            : `domain-${module}-${subdir}-${i + 1}`,
        include: chunk,
      })
    })
  }

  return slices
}

function isOom(combined, signal) {
  return (
    signal === 'SIGABRT' ||
    signal === 'SIGKILL' ||
    /heap out of memory|JavaScript heap out of memory|FATAL ERROR/i.test(combined)
  )
}

function cleanupLegacyScopedArtifacts() {
  if (existsSync(LEGACY_TSCONFIG)) unlinkSync(LEGACY_TSCONFIG)
  if (existsSync(LEGACY_TSC_BUILDINFO)) unlinkSync(LEGACY_TSC_BUILDINFO)
}

function uniqueScopedConfigPath() {
  return join(
    process.cwd(),
    `tsconfig.scoped.${process.pid}.${randomBytes(4).toString('hex')}.json`,
  )
}

function tscMissingError(sliceId) {
  return {
    file: TSC_BIN,
    line: 0,
    col: 0,
    code: 'TSC0',
    message: `tsc binary missing: ${TSC_BIN}`,
    raw: `typecheck-scoped: [${sliceId}] tsc binary missing: ${TSC_BIN}`,
  }
}

function tscExitedUnparsedError(sliceId, status, signal, combined) {
  const detail = `tsc exited ${status ?? 'null'} signal ${signal ?? 'none'}`
  return {
    file: TSC_BIN,
    line: 0,
    col: 0,
    code: 'TSC1',
    message: detail,
    raw: `typecheck-scoped: [${sliceId}] ${detail}${combined.trim() ? `\n${combined.trim()}` : ''}`,
  }
}

function scopedTsConfig(include) {
  return {
    extends: './tsconfig.json',
    compilerOptions: {
      // Each slice uses a different `include`; sharing incremental state causes cache
      // corruption, multi-minute hangs, and intermittent OOM (tsconfig.scoped.tsbuildinfo).
      incremental: false,
    },
    include,
  }
}

function emitJsonAndExit(results, allErrors, oomSlice) {
  const byFile = {}
  for (const e of allErrors) {
    byFile[e.file] = (byFile[e.file] ?? 0) + 1
  }
  console.log(
    JSON.stringify({
      ok: allErrors.length === 0 && !oomSlice,
      slices: results.map((r) => ({
        id: r.id,
        ms: r.ms,
        errors: r.errors.length,
        oom: r.oom,
        skipped: r.skipped ?? false,
      })),
      errors: allErrors,
      byFile,
      ...(oomSlice ? { oom: true, oomSlice: oomSlice.id } : {}),
    }),
  )
}

function chunkArray(items, size) {
  if (items.length <= size) return [items]
  const chunks = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

function parseTscErrors(output) {
  const errors = []
  for (const line of output.split('\n')) {
    const match = line.match(/^(.+)\((\d+),(\d+)\): error (TS\d+): (.+)$/)
    if (!match) continue
    errors.push({
      file: match[1],
      line: Number(match[2]),
      col: Number(match[3]),
      code: match[4],
      message: match[5],
      raw: line,
    })
  }
  return errors
}

function filterErrorsByPaths(errors, paths) {
  const normalized = paths.map((p) => resolve(p))
  return errors.filter((e) =>
    normalized.some((p) => resolve(e.file) === p || e.file.includes(p.replace(process.cwd() + '/', ''))),
  )
}

function runSlice(slice, { json, scopePaths, failOnOutside }) {
  const include = Array.isArray(slice.include) ? slice.include : [slice.include]
  if (!include.length) {
    return { id: slice.id, ms: 0, errors: [], oom: false, skipped: true }
  }

  cleanupLegacyScopedArtifacts()
  if (!existsSync(TSC_BIN)) {
    const missing = tscMissingError(slice.id)
    if (!json) console.error(missing.raw)
    return { id: slice.id, ms: 0, errors: [missing], oom: false, skipped: false, exitCode: 1 }
  }

  const configPath = uniqueScopedConfigPath()
  const config = scopedTsConfig(include)
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`)

  const t0 = Date.now()
  let result
  try {
    result = spawnSync(process.execPath, [TSC_BIN, '--noEmit', '--incremental', 'false', '-p', configPath], {
      encoding: 'utf8',
      env: { ...process.env, NODE_OPTIONS: NODE_OPTS },
      maxBuffer: 64 * 1024 * 1024,
    })
  } finally {
    if (existsSync(configPath)) unlinkSync(configPath)
  }
  const ms = Date.now() - t0
  const combined = `${result.stdout ?? ''}\n${result.stderr ?? ''}`

  if (isOom(combined, result.signal)) {
    return { id: slice.id, ms, errors: [], oom: true, skipped: false, combined }
  }

  const allErrors = parseTscErrors(combined)
  if (allErrors.length === 0 && (result.status !== 0 || result.signal || result.error)) {
    allErrors.push(
      tscExitedUnparsedError(slice.id, result.status, result.signal, combined),
    )
  }
  let errors = allErrors
  if (scopePaths?.length) {
    errors = filterErrorsByPaths(allErrors, scopePaths)
    const outside = allErrors.filter((e) => !errors.includes(e))
    if (outside.length && !failOnOutside && !json) {
      console.warn(`typecheck-scoped: [${slice.id}] ignoring ${outside.length} error(s) outside scope`)
    }
    if (outside.length && failOnOutside) {
      errors = allErrors
    }
  }

  if (!json) {
    const status = errors.length ? `${errors.length} error(s)` : 'clean'
    console.log(`typecheck-scoped: [${slice.id}] ${(ms / 1000).toFixed(1)}s — ${status}`)
    if (errors.length) {
      for (const e of errors.slice(0, 20)) {
        console.error(e.raw)
      }
      if (errors.length > 20) {
        console.error(`… and ${errors.length - 20} more`)
      }
    }
  }

  return { id: slice.id, ms, errors, oom: false, skipped: false, combined, exitCode: result.status ?? 1 }
}

function writeLog(results) {
  try {
    mkdirSync('.local', { recursive: true })
    const lines = results.flatMap((r) => r.errors.map((e) => e.raw))
    writeFileSync(LOG_PATH, lines.join('\n') + (lines.length ? '\n' : ''))
  } catch {
    /* best effort */
  }
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  let slices = []
  let scopePaths = []

  if (opts.fromMarker) {
    scopePaths = readMarker(opts.markerPath ?? markerPathForCwd())
    if (!scopePaths.length) {
      if (opts.json) {
        console.log(JSON.stringify({ ok: true, files: [], errors: [], skipped: true }))
      } else {
        console.log('typecheck-scoped: no edited src files in marker — skip')
      }
      return
    }
    slices = [{ id: 'edited-files', include: scopePaths }]
  } else if (opts.files.length) {
    scopePaths = opts.files
    const chunks = chunkArray(opts.files, FILES_CHUNK_SIZE)
    slices = chunks.map((files, index) => ({
      id: chunks.length === 1 ? 'files' : `files-${index + 1}`,
      include: files,
    }))
  } else if (opts.module) {
    slices = moduleSlices(opts.module)
    if (!opts.json && slices.length > 1) {
      console.log(`typecheck-scoped: [${opts.module}] ${slices.length} chunk(s)…`)
    }
  } else if (opts.changed) {
    scopePaths = changedTsFiles()
    if (!scopePaths.length) {
      console.log('typecheck-scoped: no changed src TS files — skip')
      return
    }
    slices = [{ id: 'changed', include: scopePaths }]
  } else if (opts.allSlices) {
    slices = SLICES
  } else {
    console.error(`Usage:
  node scripts/typecheck-scoped.mjs --files <path>...
  node scripts/typecheck-scoped.mjs --module <name>
  node scripts/typecheck-scoped.mjs --changed
  node scripts/typecheck-scoped.mjs --all-slices [--json]`)
    process.exit(2)
  }

  const results = []
  const total = slices.length

  for (let i = 0; i < slices.length; i++) {
    const slice = slices[i]
    if (!opts.json && (opts.allSlices || opts.module)) {
      console.log(`typecheck-scoped: [${i + 1}/${total}] ${slice.id}…`)
    }
    const sliceOpts = {
      json: opts.json,
      scopePaths: scopePaths.length ? scopePaths : undefined,
      failOnOutside: opts.failOnOutside,
    }
    const result = runSlice(slice, sliceOpts)
    if (result.oom && slice.include.length > 1) {
      if (!opts.json) {
        console.warn(
          `typecheck-scoped: [${slice.id}] OOM — retrying ${slice.include.length} file(s) individually`,
        )
      }
      for (const file of slice.include) {
        const subSlice = { id: `${slice.id}::${file}`, include: [file] }
        results.push(
          runSlice(subSlice, {
            ...sliceOpts,
            scopePaths: [file],
          }),
        )
      }
    } else {
      results.push(result)
      if (result.oom && !opts.json) {
        console.error(`typecheck-scoped: [${slice.id}] OOM — try a smaller slice or increase NODE_OPTIONS`)
      }
      if (result.oom) break
    }
  }

  const allErrors = results.flatMap((r) => r.errors)
  const oomSlice = results.find((r) => r.oom)
  writeLog(results)

  if (opts.json) {
    emitJsonAndExit(results, allErrors, oomSlice)
  } else if (oomSlice) {
    console.error(`typecheck-scoped: [${oomSlice.id}] OOM — try a smaller slice or increase NODE_OPTIONS`)
  } else if (opts.module && !opts.json && allErrors.length) {
    console.log(
      `typecheck-scoped: [${opts.module}] done — ${allErrors.length} error(s) across ${results.length} run(s)`,
    )
  } else if (opts.allSlices) {
    const totalMs = results.reduce((s, r) => s + r.ms, 0)
    console.log(
      `typecheck-scoped: done ${total} slice(s) in ${(totalMs / 1000).toFixed(1)}s — ${allErrors.length} error(s)`,
    )
  }

  cleanupLegacyScopedArtifacts()

  if (allErrors.length || oomSlice) {
    process.exit(1)
  }
}

main()
