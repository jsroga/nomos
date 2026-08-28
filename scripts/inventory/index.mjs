/**
 * Counts occurrences of a named pattern across `src`, per file.
 *
 * Four specs open by measuring what they are about to change (SPEC-12, 13, 14,
 * 16). They share this so the counting logic exists once and the numbers in
 * their tests are produced the same way.
 *
 * Results feed ratchet assertions — `toBeLessThanOrEqual` against
 * `.quality-ratchet.json` — never equality. An exact count fails on any
 * unrelated commit that happens to move it, and a test that fails for reasons
 * unrelated to its subject gets deleted.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const SRC = 'src'
const CODE_EXTENSIONS = ['.ts', '.tsx']
const SKIP_DIRECTORIES = new Set(['node_modules', '__tests__'])

/** Every source file under `src`, excluding tests and vendored code. */
export function sourceFiles(root = SRC) {
  const found = []
  for (const entry of readdirSync(root)) {
    if (SKIP_DIRECTORIES.has(entry)) continue
    const path = join(root, entry)
    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(path))
      continue
    }
    if (!CODE_EXTENSIONS.some(extension => entry.endsWith(extension))) continue
    if (entry.includes('.test.')) continue
    found.push(path)
  }
  return found
}

/**
 * Apply a matcher to every source file.
 *
 * @param {(line: string, file: string) => string | null} classify
 *   Returns a bucket name for a matching line, or null to ignore it.
 * @returns {{ total: number, byBucket: Record<string, string[]>, byFile: Record<string, number> }}
 */
export function inventory(classify, root = SRC) {
  const byBucket = {}
  const byFile = {}
  let total = 0

  for (const file of sourceFiles(root)) {
    const relativePath = relative(process.cwd(), file)
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const bucket = classify(line, relativePath)
      if (!bucket) continue
      total += 1
      byBucket[bucket] = byBucket[bucket] ?? []
      byBucket[bucket].push(relativePath)
      byFile[relativePath] = (byFile[relativePath] ?? 0) + 1
    }
  }

  return { total, byBucket, byFile }
}
