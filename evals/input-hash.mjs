/**
 * A stable hash over the sources an eval result depends on.
 *
 * Plain `.mjs`, like `scripts/inventory/`, so the pre-commit check can import
 * it under bare `node` — a second copy of the file walk in JS would be a
 * declaration that drifts from the one the runner uses.
 *
 * "Were the evals run against this prompt?" is a question about *content*, not
 * about time — a timestamp check goes stale on an unrelated rebase and passes
 * on a rebase that changed a prompt. Sorted paths, file contents only, no
 * mtimes and no directory order.
 */
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/**
 * What an eval result depends on. Prompts and agents are the obvious half; the
 * datasets are here because a changed golden example makes an old score
 * incomparable just as surely as a changed prompt does.
 */
export const EVAL_WATCHED_PATHS = [
  'src/domains/storyteller/ai',
  'src/domains/game-design/ai',
  'src/domains/loop-creator/ai',
  'src/shared/agent-kernel',
  'src/mastra/agents',
  'evals/datasets',
  'evals/constants',
]

const WATCHED_EXTENSIONS = ['.ts', '.tsx', '.json', '.md']
const SKIP_DIRECTORIES = new Set(['node_modules', '__tests__', '__snapshots__'])
const HASH_ALGORITHM = 'sha256'
const HASH_ENCODING = 'hex'

/** Every watched file, repo-relative and POSIX-separated, sorted. */
export function watchedFiles(root = process.cwd()) {
  const found = []

  const walk = directory => {
    for (const entry of readdirSync(directory)) {
      if (SKIP_DIRECTORIES.has(entry)) continue
      const full = join(directory, entry)
      if (statSync(full).isDirectory()) {
        walk(full)
        continue
      }
      if (!WATCHED_EXTENSIONS.some(extension => entry.endsWith(extension))) continue
      if (entry.includes('.test.')) continue
      found.push(relative(root, full).split(sep).join('/'))
    }
  }

  for (const watched of EVAL_WATCHED_PATHS) {
    const absolute = join(root, watched)
    try {
      walk(absolute)
    } catch {
      // A watched path that does not exist contributes nothing rather than
      // throwing: a domain can be removed without breaking every eval result.
    }
  }

  return found.sort()
}

/** True when a repo-relative path is in the eval watch set (prefix + extension). */
export function isWatchedRelativePath(relativePath) {
  const posix = relativePath.split(sep).join('/')
  if (posix.includes('.test.')) return false
  if (!WATCHED_EXTENSIONS.some(extension => posix.endsWith(extension))) return false
  return EVAL_WATCHED_PATHS.some(
    prefix => posix === prefix || posix.startsWith(`${prefix}/`)
  )
}

/**
 * Staged snapshot as `{ path, content }[]`. `names` are git staged paths;
 * `readContent` is injectable (`git show :path` in production, a map in tests).
 */
export function stagedEntries(names, readContent) {
  return names.filter(isWatchedRelativePath).map(path => ({
    path,
    content: readContent(path),
  }))
}

/** Stable hash of `{ path, content }[]`. Path is part of the digest. */
export function hashFromEntries(entries) {
  const hash = createHash(HASH_ALGORITHM)
  const sorted = [...entries].sort((left, right) => left.path.localeCompare(right.path))
  for (const entry of sorted) {
    hash.update(entry.path)
    hash.update(entry.content)
  }
  return hash.digest(HASH_ENCODING)
}

/** The hash of the watched sources as they are on disk right now. */
export function inputHash(root = process.cwd()) {
  return hashFromEntries(
    watchedFiles(root).map(file => ({
      path: file,
      content: readFileSync(join(root, file)),
    }))
  )
}

/** Hash of injected staged entries. Tests pass `{ path, content }[]`; do not git the fixture tree. */
export function stagedHash(entries) {
  return hashFromEntries(entries)
}
