/**
 * docs/ flat-catalog gate — shared by structure.test.ts and check-architecture.
 */
import fs from 'node:fs'
import path from 'node:path'
import {
  DOCS_ALLOWED_FILES,
  DOCS_FORBIDDEN_DIR_NAMES,
  DOCS_IGNORED_ENTRIES,
} from './docs-allowlist.mjs'

export type DocsCatalogViolation = {
  path: string
  reason: string
}

/**
 * Scan `docsDir` for trash: subfolders, non-allowlisted files, forbidden bucket names.
 */
export function findDocsCatalogViolations(docsDir: string): DocsCatalogViolation[] {
  if (!fs.existsSync(docsDir)) {
    return [{ path: 'docs/', reason: 'docs/ directory missing' }]
  }

  const violations: DocsCatalogViolation[] = []

  for (const entry of fs.readdirSync(docsDir, { withFileTypes: true })) {
    if (DOCS_IGNORED_ENTRIES.has(entry.name)) continue

    const rel = `docs/${entry.name}`

    if (entry.isDirectory()) {
      const reason = DOCS_FORBIDDEN_DIR_NAMES.has(entry.name)
        ? 'forbidden docs/ subfolder (removed catalog) — delete or fold into allowlisted files'
        : 'docs/ must stay flat — no subfolders (allowed files only; see docs/README.md)'
      violations.push({ path: rel, reason })
      continue
    }

    if (!entry.isFile()) {
      violations.push({ path: rel, reason: 'unsupported docs/ entry type' })
      continue
    }

    if (!DOCS_ALLOWED_FILES.has(entry.name)) {
      violations.push({
        path: rel,
        reason: `not in docs allowlist (${[...DOCS_ALLOWED_FILES].join(', ')})`,
      })
    }
  }

  for (const required of DOCS_ALLOWED_FILES) {
    if (!fs.existsSync(path.join(docsDir, required))) {
      violations.push({
        path: `docs/${required}`,
        reason: 'required docs catalog file missing',
      })
    }
  }

  return violations
}
