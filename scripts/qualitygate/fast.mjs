#!/usr/bin/env node
/**
 * Fast quality gate: scoped TSC + ESLint + code metrics on touched files (~5–15s).
 */
import { spawnSync, execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { checkCodeMetrics } from '../check-code-metrics.mjs'

const NODE_OPTS = process.env.NODE_OPTIONS ?? '--max-old-space-size=6144'

export function parseFastArgs(argv) {
  const opts = { files: [], changed: false, fromMarker: false, hookMode: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--files') {
      while (argv[i + 1] && !argv[i + 1].startsWith('--')) opts.files.push(argv[++i])
    } else if (arg === '--changed') opts.changed = true
    else if (arg === '--from-marker') opts.fromMarker = true
    else if (arg === '--hook') opts.hookMode = true
    else if (!arg.startsWith('--') && /\.(ts|tsx)$/.test(arg)) opts.files.push(arg)
  }
  return opts
}

function run(cmd, args) {
  return spawnSync(cmd, args, {
    encoding: 'utf8',
    env: { ...process.env, NODE_OPTIONS: NODE_OPTS },
    maxBuffer: 64 * 1024 * 1024,
  })
}

function repoRoot() {
  return execSync('git rev-parse --show-toplevel 2>/dev/null || pwd', { encoding: 'utf8' }).trim()
}

function markerPath() {
  const root = repoRoot()
  const hash = execSync(`printf '%s' '${root.replace(/'/g, "'\\''")}' | shasum | cut -c1-12`, {
    encoding: 'utf8',
    shell: '/bin/bash',
  }).trim()
  return `${process.env.TMPDIR ?? '/tmp'}/cursor-edited-src.${hash}`
}

function readMarkerFiles() {
  const marker = markerPath()
  if (!existsSync(marker)) return []
  return [
    ...new Set(
      readFileSync(marker, 'utf8')
        .split('\n')
        .map((l) => l.trim())
        .filter((f) => f.startsWith('src/') && /\.(ts|tsx)$/.test(f)),
    ),
  ]
}

export function changedTsFiles() {
  const git = run('git', ['diff', '--name-only', 'HEAD', '--', 'src'])
  const untracked = run('git', ['ls-files', '--others', '--exclude-standard', 'src'])
  return [
    ...new Set(
      `${git.stdout ?? ''}\n${untracked.stdout ?? ''}`
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => /\.(ts|tsx)$/.test(f) && existsSync(f)),
    ),
  ]
}

export function resolveFastFiles(opts) {
  if (opts.fromMarker) return readMarkerFiles()
  if (opts.changed) return changedTsFiles()
  return opts.files
}

function eslintErrorLines(files) {
  if (!files.length) return []
  const eslint = run('npx', ['eslint', ...files])
  const out = `${eslint.stdout ?? ''}\n${eslint.stderr ?? ''}`
  // Match real error rows only — not the "✖ N problems" summary and not warnings.
  return out.split('\n').filter((l) => /^\s*\d+:\d+\s+error\s/.test(l) || /\serror\s{2,}/.test(l))
}

/** @param {string[]} files */
export function structuredIssues(files, tscErrors, lintErrorLines, metrics) {
  /** @type {{ file: string, line: number|null, kind: string, message: string }[]} */
  const items = []
  const defaultFile = files.length === 1 ? files[0] : null
  let currentFile = defaultFile

  for (const line of tscErrors) {
    const m = line.match(/^(src\/[^\s:]+\.tsx?):(\d+):\d+\s+-\s+error TS\d+:\s*(.+)$/)
    if (m) items.push({ file: m[1], line: Number(m[2]), kind: 'TSC', message: m[3].trim() })
  }

  for (const line of lintErrorLines) {
    if (line.match(/^(src\/|\.\/src\/|\/).+\.(ts|tsx)$/)) {
      const fm = line.match(/(src\/[^\s]+\.tsx?)/)
      if (fm) currentFile = fm[1]
      continue
    }
    const m = line.match(/^\s*(\d+):(\d+)\s+error\s+(.+?)\s{2,}([\w@./-]+)\s*$/)
    if (m && currentFile) {
      items.push({
        file: currentFile,
        line: Number(m[1]),
        kind: `eslint:${m[4]}`,
        message: m[3].trim(),
      })
    }
  }

  for (const message of [...metrics.errors, ...metrics.warnings]) {
    const m = message.match(/^(src\/[^:]+):(\d+)\s+(.+)$/) ?? message.match(/^(src\/[^:]+):\s+(.+)$/)
    if (m) {
      items.push({
        file: m[1],
        line: m[2] && /^\d+$/.test(m[2]) ? Number(m[2]) : null,
        kind: message.includes('warn limit') ? 'metrics-warn' : 'metrics',
        message: (m[3] ?? m[2] ?? message).trim(),
      })
    }
  }

  return items
}

/** @param {ReturnType<typeof parseFastArgs>} opts */
export function runFastGate(opts) {
  const files = resolveFastFiles(opts)

  if (!files.length) {
    return {
      files: [],
      skipped: true,
      ok: true,
      summary: 'qualitygate: no src TS files in scope — skip',
      tscErrors: [],
      lintErrors: [],
      metricErrors: [],
      metricWarnings: [],
      issues: [],
      ms: 0,
      tscStatus: 0,
    }
  }

  const t0 = Date.now()
  const tsc = run('node', ['scripts/typecheck-scoped.mjs', '--files', ...files])
  const tscOut = `${tsc.stdout ?? ''}\n${tsc.stderr ?? ''}`
  const tscErrors = tscOut.split('\n').filter((l) => /error TS\d+/.test(l))
  const lintErrors = eslintErrorLines(files)
  const metrics = checkCodeMetrics({ files })
  const metricErrors = metrics.errors.map((message) => `metrics error ${message}`)
  const metricWarnings = metrics.warnings.map((message) => `metrics warn ${message}`)
  const issues = structuredIssues(files, tscErrors, lintErrors, metrics)
  const ms = Date.now() - t0
  const summary = `qualitygate: ${files.length} file(s) · ${(ms / 1000).toFixed(1)}s · TSC ${tscErrors.length} · ESLint ${lintErrors.length} · metrics ${metricErrors.length}e/${metricWarnings.length}w`
  const ok = !(tscErrors.length || lintErrors.length || metricErrors.length || tsc.status !== 0)

  return {
    files,
    skipped: false,
    ok,
    summary,
    tscErrors,
    lintErrors,
    metricErrors,
    metricWarnings,
    issues,
    ms,
    tscStatus: tsc.status ?? 0,
  }
}

export function printFastGateResult(result, { hookMode = false } = {}) {
  if (result.skipped) {
    if (hookMode) {
      console.log(JSON.stringify({ user_message: result.summary, ok: true, skipped: true }))
      return 0
    }
    console.log(result.summary)
    return 0
  }

  if (hookMode) {
    const detail = [
      ...result.tscErrors.slice(0, 12),
      ...result.lintErrors.slice(0, 8),
      ...result.metricErrors.slice(0, 8),
      ...result.metricWarnings.slice(0, 4),
    ]
    const user_message =
      detail.length === 0 ? `${result.summary} — clean` : `${result.summary}\n${detail.join('\n')}`
    // Always exit 0 in hook mode — the stop script decides followup_message.
    console.log(JSON.stringify({ user_message, ok: result.ok, skipped: false }))
    return 0
  }

  console.log(result.summary)
  if (result.tscErrors.length) console.error('\n--- TSC ---\n' + result.tscErrors.slice(0, 30).join('\n'))
  if (result.lintErrors.length) console.error('\n--- ESLint ---\n' + result.lintErrors.slice(0, 30).join('\n'))
  if (result.metricErrors.length) {
    console.error('\n--- Code metrics (errors) ---\n' + result.metricErrors.slice(0, 30).join('\n'))
  }
  if (result.metricWarnings.length) {
    console.warn('\n--- Code metrics (warnings) ---\n' + result.metricWarnings.slice(0, 20).join('\n'))
  }
  return result.ok ? 0 : 1
}

function main(argv = process.argv.slice(2)) {
  const opts = parseFastArgs(argv)
  const result = runFastGate(opts)
  process.exit(printFastGateResult(result, { hookMode: opts.hookMode }))
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
