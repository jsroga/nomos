#!/usr/bin/env node
/**
 * Keep agent scratch markdown out of the repo: new .md files must be durable docs,
 * agent config, or shipped prompt assets. Everything else belongs in .local/.
 * docs/ is a flat 6-file allowlist (scripts/structure-gates/docs-allowlist.mjs).
 */
import { execSync } from 'node:child_process'
import { DOCS_ALLOWED_FILES, isAllowedDocsPath } from './structure-gates/docs-allowlist.mjs'

const WORKING_TREE = process.argv.includes('--working-tree')

const ALLOWED_ROOT_FILES = new Set(['README.md', 'AGENTS.md', 'CLAUDE.md'])
const ALLOWED_DIRS = ['.agents/', '.cursor/', '.claude/', '.fabro/', '.design-sync/', '.local/', 'evals/fixtures/']
const ALLOWED_SRC_BASENAMES = new Set(['instructions.md', 'SKILL.md'])
const ALLOWED_SRC_DIRS = ['/legal/', '/references/', '/prompts/']

/** Scratch names that belong in .local/ no matter which folder they were dropped in. */
const SCRATCH_NAME =
  /(^|[-_])(plan|audit|tracker|status|roadmap|notes|todo|findings|eval|scope|retro|clarify|decisions|structure)([-_.]|$)/i

/** Stage prompts, subagent definitions, and session starters legitimately use those names. */
const SCRATCH_NAME_EXEMPT = [
  '.fabro/',
  '.agents/execute/',
  '.agents/templates/',
  '.cursor/agents/',
  '.claude/agents/',
]

const HINT = `
Agent scratch markdown belongs in .local/ (gitignored):

  .local/sessions/<date>_<id>_<slug>/   multi-request session (PLAN/TODOS/STATUS/MEMORY)
  .local/findings/                      audits, inventories, migration notes
  .local/tmp/<id>/                      throwaway recon

docs/ is a flat catalog of exactly these files:
  ${[...DOCS_ALLOWED_FILES].join(', ')}

Durable docs only — no docs/internal, docs/adr, plans, or extra .md.
Rule: .cursor/rules/agent-artifacts.mdc
`

function gitLines(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' })
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function addedMarkdown() {
  const files = WORKING_TREE
    ? gitLines('git ls-files --others --exclude-standard')
    : gitLines('git diff --cached --name-only --diff-filter=A')
  return files.filter((f) => f.endsWith('.md'))
}

function isAllowedLocation(file) {
  if (!file.includes('/')) return ALLOWED_ROOT_FILES.has(file)
  if (file.startsWith('docs/')) return isAllowedDocsPath(file)
  // A README explains the folder it sits in — always legitimate (outside docs/).
  if (file.endsWith('/README.md')) return true
  if (file.startsWith('src/')) {
    const basename = file.slice(file.lastIndexOf('/') + 1)
    if (ALLOWED_SRC_BASENAMES.has(basename)) return true
    return ALLOWED_SRC_DIRS.some((dir) => file.includes(dir))
  }
  return ALLOWED_DIRS.some((dir) => file.startsWith(dir))
}

function violationFor(file) {
  if (file.startsWith('.local/')) return null
  if (file.startsWith('docs/')) {
    if (isAllowedDocsPath(file)) return null
    if (file.slice('docs/'.length).includes('/')) {
      return 'docs/ must stay flat (no subfolders; see docs/README.md)'
    }
    return `docs/ allowlist only (${[...DOCS_ALLOWED_FILES].join(', ')})`
  }
  if (!isAllowedLocation(file)) {
    return file.includes('/')
      ? 'not a docs/, agent-config, or shipped-prompt path'
      : 'new markdown at repo root'
  }
  if (SCRATCH_NAME_EXEMPT.some((dir) => file.startsWith(dir))) return null
  const basename = file.slice(file.lastIndexOf('/') + 1).replace(/\.md$/, '')
  if (SCRATCH_NAME.test(basename)) {
    return 'scratch artifact name (plan/audit/tracker/status/…)'
  }
  return null
}

/** Single-path mode for the Cursor preToolUse hook: exit 1 + reason on stdout. */
function checkSinglePath(raw) {
  const file = raw.replace(/^\.\//, '')
  const reason = file.endsWith('.md') ? violationFor(file) : null
  if (!reason) return
  console.log(reason)
  process.exit(1)
}

function main() {
  const pathFlag = process.argv.indexOf('--path')
  if (pathFlag !== -1 && process.argv[pathFlag + 1]) {
    checkSinglePath(process.argv[pathFlag + 1])
    return
  }

  const violations = addedMarkdown()
    .map((file) => ({ file, reason: violationFor(file) }))
    .filter((entry) => entry.reason)

  if (!violations.length) {
    console.log('check-agent-artifacts: OK')
    return
  }

  console.error('\ncheck-agent-artifacts: FAILED\n')
  for (const { file, reason } of violations) {
    console.error(`  • ${file}`)
    console.error(`    → ${reason}`)
  }
  console.error(HINT)
  process.exit(1)
}

main()
