/**
 * Canonical docs/ flat catalog — keep in sync with docs/README.md.
 * Consumed by check-agent-artifacts.mjs (Node) and structure-gates (tests).
 */
export const DOCS_ALLOWED_FILES = new Set([
  'README.md',
  'ARCHITECTURE.md',
  'MODULES.md',
  'DEVELOPMENT.md',
  'DESIGN.md',
  'MCP_API.md',
  'STORYTELLER.md',
  // Append-only architecture decision log. Flat, per this catalog's own rule —
  // an `adr/` directory is explicitly forbidden below.
  'DECISIONS.md',
])

export const DOCS_IGNORED_ENTRIES = new Set(['.DS_Store', '.gitkeep'])

export const DOCS_FORBIDDEN_DIR_NAMES = new Set([
  'adr',
  'agents',
  'evaluation',
  'internal',
  'legacy',
  'testing',
  'unified',
])

/** @param {string} relPath repo-relative path */
export function isAllowedDocsPath(relPath) {
  const normalized = relPath.replace(/^\.\//, '')
  if (!normalized.startsWith('docs/')) return false
  const rest = normalized.slice('docs/'.length)
  if (!rest || rest.includes('/')) return false
  return DOCS_ALLOWED_FILES.has(rest)
}
