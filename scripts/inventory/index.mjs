/**
 * Counts occurrences of a named pattern across `src`, per AST node.
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
import { AstKind, identityOf, statementBucketKey, walkSourceFile } from './ast.mjs'

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
 * Counts are **identity length** (two guards in one file still count two), not
 * unique files. Nested matches on the same statement collapse to the first
 * bucket so a line-split import or nested `recordFromJson(readString())` does
 * not inflate the ratchet.
 *
 * @param {(text: string, file: string) => string | null} classify
 *   Returns a bucket name for a matching node, or null to ignore it.
 * @returns {{ total: number, byBucket: Record<string, string[]>, byFile: Record<string, number>, identities: string[], identitiesByBucket: Record<string, string[]> }}
 */
export function inventory(classify, root = SRC) {
  const byBucket = {}
  const identitiesByBucket = {}
  const byFile = {}
  const identities = []
  const seenStatementBucket = new Set()
  let total = 0

  for (const file of sourceFiles(root)) {
    const relativePath = relative(process.cwd(), file)
    const source = readFileSync(file, 'utf8')
    for (const node of walkSourceFile(relativePath, source)) {
      if (node.kind === AstKind.Comment) continue
      const bucket = classify(node.text, relativePath)
      if (!bucket) continue
      const statementKey = statementBucketKey(
        relativePath,
        node.statementOrdinal ?? 0,
        bucket,
      )
      if (seenStatementBucket.has(statementKey)) continue
      seenStatementBucket.add(statementKey)
      const id = identityOf(node)
      total += 1
      byBucket[bucket] = byBucket[bucket] ?? []
      byBucket[bucket].push(relativePath)
      identitiesByBucket[bucket] = identitiesByBucket[bucket] ?? []
      identitiesByBucket[bucket].push(id)
      byFile[relativePath] = (byFile[relativePath] ?? 0) + 1
      identities.push(id)
    }
  }

  return { total, byBucket, byFile, identities, identitiesByBucket }
}
