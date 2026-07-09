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
import { execSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const NODE_OPTS = process.env.NODE_OPTIONS ?? '--max-old-space-size=4096'
const TSCONFIG = 'tsconfig.scoped.json'
const LOG_PATH = '.local/typecheck-latest.log'

const DOMAIN_MODULES = [
  'storyteller',
  'chat',
  'interior-designer',
  'loop-creator',
  'marketing',
  'deduction-puzzle-designer',
  '3d-asset-exporter',
  'game-design',
  'world-building-toolkit',
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
      'src/middleware.ts',
      'src/mastra.ts',
    ],
  },
  { id: 'app-api-storyteller', include: ['src/app/api/storyteller/**/*.ts', 'src/app/api/storyteller/**/*.tsx'] },
  { id: 'app-api-entities', include: ['src/app/api/entities/**/*.ts', 'src/app/api/entities/**/*.tsx'] },
  { id: 'app-api-world', include: ['src/app/api/world/**/*.ts', 'src/app/api/world/**/*.tsx'] },
  { id: 'app-api-interior', include: ['src/app/api/interior-designer/**/*.ts', 'src/app/api/interior-designer/**/*.tsx'] },
  { id: 'app-api-trigger', include: ['src/app/api/trigger*/**/*.ts', 'src/app/api/trigger*/**/*.tsx'] },
  { id: 'app-api-auth', include: ['src/app/api/auth/**/*.ts', 'src/app/api/auth/**/*.tsx'] },
  { id: 'app-api-rest', include: ['src/app/api/**/*.ts', 'src/app/api/**/*.tsx'] },
  ...DOMAIN_MODULES.map((name) => ({
    id: `domain-${name}`,
    include: [
      `src/domains/${name}/**/*.ts`,
      `src/domains/${name}/**/*.tsx`,
      `src/app/api/${name}/**/*.ts`,
      `src/app/api/${name}/**/*.tsx`,
    ],
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

function moduleSlice(module) {
  if (module === 'src-root') {
    return { id: 'src-root', include: changedTsFiles() }
  }
  const found = SLICES.find((s) => s.id === `domain-${module}`)
  if (found) return found
  throw new Error(`Unknown module: ${module}`)
}

function isOom(combined, signal) {
  return (
    signal === 'SIGABRT' ||
    /heap out of memory|JavaScript heap out of memory|FATAL ERROR/i.test(combined)
  )
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

  const config = { extends: './tsconfig.json', include }
  writeFileSync(TSCONFIG, `${JSON.stringify(config, null, 2)}\n`)

  const t0 = Date.now()
  const result = spawnSync('npx', ['tsc', '--noEmit', '-p', TSCONFIG], {
    encoding: 'utf8',
    env: { ...process.env, NODE_OPTIONS: NODE_OPTS },
    maxBuffer: 64 * 1024 * 1024,
  })
  const ms = Date.now() - t0
  const combined = `${result.stdout ?? ''}\n${result.stderr ?? ''}`

  if (isOom(combined, result.signal)) {
    return { id: slice.id, ms, errors: [], oom: true, skipped: false, combined }
  }

  const allErrors = parseTscErrors(combined)
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
    slices = [{ id: 'files', include: opts.files }]
  } else if (opts.module) {
    slices = [moduleSlice(opts.module)]
    if (opts.module === 'src-root') {
      scopePaths = slices[0].include
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
    if (!opts.json && opts.allSlices) {
      console.log(`typecheck-scoped: [${i + 1}/${total}] ${slice.id}…`)
    }
    const result = runSlice(slice, {
      json: opts.json,
      scopePaths: scopePaths.length ? scopePaths : undefined,
      failOnOutside: opts.failOnOutside,
    })
    results.push(result)
    if (result.oom) {
      console.error(`typecheck-scoped: [${slice.id}] OOM — try a smaller slice or increase NODE_OPTIONS`)
      process.exit(1)
    }
  }

  const allErrors = results.flatMap((r) => r.errors)
  writeLog(results)

  if (opts.json) {
    const byFile = {}
    for (const e of allErrors) {
      byFile[e.file] = (byFile[e.file] ?? 0) + 1
    }
    console.log(
      JSON.stringify({
        ok: allErrors.length === 0,
        slices: results.map((r) => ({
          id: r.id,
          ms: r.ms,
          errors: r.errors.length,
          oom: r.oom,
          skipped: r.skipped ?? false,
        })),
        errors: allErrors,
        byFile,
      }),
    )
  } else if (opts.allSlices) {
    const totalMs = results.reduce((s, r) => s + r.ms, 0)
    console.log(
      `typecheck-scoped: done ${total} slice(s) in ${(totalMs / 1000).toFixed(1)}s — ${allErrors.length} error(s)`,
    )
  }

  if (existsSync(TSCONFIG)) unlinkSync(TSCONFIG)

  if (allErrors.length) {
    process.exit(1)
  }
}

main()
