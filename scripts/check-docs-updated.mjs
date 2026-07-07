#!/usr/bin/env node
/**
 * Require docs/ updates when a commit changes project structure or public contracts.
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
const REPO_ROOT = process.cwd()

const DOC_HINTS = {
  newDomain:
    'Add or update module docs under docs/internal/ and note the module in docs/README.md.',
  newDomainFolder:
    'Update docs/unified/ARCHITECTURE.md or docs/unified/SPEC.md if this folder is part of the target blueprint.',
  srcTopology:
    'Update docs/ARCHITECTURE.md § `src/` topology to match the new layout.',
  shared:
    'Update docs/ARCHITECTURE.md / docs/unified/ARCHITECTURE.md §3 for shared/ changes.',
  dependencies:
    'Update docs/ARCHITECTURE.md (Third-Party Services) or docs/MCP_API.md when dependencies change.',
  eslint:
    'Update docs/unified/ARCHITECTURE.md or domain-structure rules when import/barrel policy changes.',
}

const WORKING_TREE = process.argv.includes('--working-tree')

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

/** Fabro verify: unstaged + untracked changes (no git index). */
function workingTreeCandidates() {
  const parts = []
  parts.push(...gitLines('git diff --name-only --diff-filter=ACMR HEAD'))
  parts.push(...gitLines('git ls-files --others --exclude-standard'))
  return [...new Set(parts)]
}

function workingTreeAdded(candidates) {
  const untracked = new Set(gitLines('git ls-files --others --exclude-standard'))
  const added = gitLines('git diff --name-only --diff-filter=A HEAD')
  return [...new Set([...added, ...candidates.filter((f) => untracked.has(f))])]
}

function dirExistsInHead(posixDir) {
  if (!posixDir) return false
  try {
    const out = execSync(`git ls-tree --name-only "HEAD:${posixDir}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return out.trim().length > 0
  } catch {
    return false
  }
}

function detectStructuralReasons(staged, added) {
  /** @type {{ reason: string; hint: string }[]} */
  const reasons = []

  for (const file of added) {
    const parts = file.split('/')

    if (parts[0] === 'src' && parts[1] === 'domains' && parts.length >= 3) {
      const domain = parts[2]
      const domainRoot = `src/domains/${domain}`
      if (!dirExistsInHead(domainRoot)) {
        reasons.push({
          reason: `new domain module src/domains/${domain}/`,
          hint: DOC_HINTS.newDomain,
        })
        continue
      }

      if (parts.length >= 4 && parts[3]) {
        const sub = parts[3]
        if (sub === '__tests__' || sub.endsWith('.config.ts')) continue
        const subPath = `${domainRoot}/${sub}`
        const subIsDir = fs.existsSync(path.join(REPO_ROOT, subPath)) &&
          fs.statSync(path.join(REPO_ROOT, subPath)).isDirectory()
        if (subIsDir && !dirExistsInHead(subPath)) {
          reasons.push({
            reason: `new top-level folder in domain: ${subPath}/`,
            hint: DOC_HINTS.newDomainFolder,
          })
        }
      }
    }

    if (parts[0] === 'src' && parts.length >= 2 && parts[1] !== 'domains') {
      const top = parts[1]
      const topPath = `src/${top}`
      const isDir =
        fs.existsSync(path.join(REPO_ROOT, topPath)) &&
        fs.statSync(path.join(REPO_ROOT, topPath)).isDirectory()
      if (isDir && !dirExistsInHead(topPath)) {
        reasons.push({
          reason: `new top-level src folder: ${topPath}/`,
          hint: DOC_HINTS.srcTopology,
        })
      }
    }

    if (
      parts.length >= 2 &&
      parts[0] !== 'src' &&
      parts[0] !== 'docs' &&
      !parts[0].startsWith('.') &&
      parts[0] !== 'node_modules'
    ) {
      const rootDir = parts[0]
      const rootPath = rootDir
      const isDir =
        fs.existsSync(path.join(REPO_ROOT, rootPath)) &&
        fs.statSync(path.join(REPO_ROOT, rootPath)).isDirectory()
      if (isDir && !dirExistsInHead(rootPath)) {
        reasons.push({
          reason: `new top-level repo folder: ${rootDir}/`,
          hint: DOC_HINTS.srcTopology,
        })
      }
    }
  }

  for (const file of added) {
    const parts = file.split('/')
    if (parts[0] === 'src' && parts[1] === 'shared' && parts.length >= 3) {
      const sub = parts[2]
      const subPath = `src/shared/${sub}`
      const isDir =
        fs.existsSync(path.join(REPO_ROOT, subPath)) &&
        fs.statSync(path.join(REPO_ROOT, subPath)).isDirectory()
      if (isDir && !dirExistsInHead(subPath)) {
        reasons.push({
          reason: `new top-level folder in shared: ${subPath}/`,
          hint: DOC_HINTS.shared,
        })
      }
    }
  }

  const unique = []
  const seen = new Set()
  for (const r of reasons) {
    const key = `${r.reason}|${r.hint}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(r)
  }
  return unique
}

function main() {
  const candidates = WORKING_TREE
    ? workingTreeCandidates()
    : gitLines('git diff --cached --name-only --diff-filter=ACMR')

  if (!candidates.length) {
    console.log(
      WORKING_TREE
        ? 'check-docs-updated: no working-tree changes — skip'
        : 'check-docs-updated: no staged files — skip',
    )
    return
  }

  const docsOnly = candidates.every((f) => f.startsWith('docs/') || f.endsWith('.md'))
  if (docsOnly) {
    console.log('check-docs-updated: docs-only changes — skip')
    return
  }

  const hasDocsChanged = candidates.some((f) => f.startsWith('docs/'))

  const added = WORKING_TREE
    ? workingTreeAdded(candidates)
    : gitLines('git diff --cached --name-only --diff-filter=A')

  const reasons = detectStructuralReasons(candidates, added)

  if (candidates.includes('package.json')) {
    try {
      const diff = WORKING_TREE
        ? execSync('git diff HEAD package.json', { encoding: 'utf8' })
        : execSync('git diff --cached package.json', { encoding: 'utf8' })
      if (
        /"dependencies"|"devDependencies"|"scripts"/.test(diff) &&
        /[+-]\s*"/.test(diff)
      ) {
        const key = 'package.json dependencies or scripts changed|' + DOC_HINTS.dependencies
        if (!reasons.some((r) => `${r.reason}|${r.hint}` === key)) {
          reasons.push({
            reason: 'package.json dependencies or scripts changed',
            hint: DOC_HINTS.dependencies,
          })
        }
      }
    } catch {
      reasons.push({
        reason: 'package.json added',
        hint: DOC_HINTS.dependencies,
      })
    }
  }

  if (candidates.includes('eslint.config.js')) {
    const key = 'eslint.config.js changed (barrel / import policy)|' + DOC_HINTS.eslint
    if (!reasons.some((r) => `${r.reason}|${r.hint}` === key)) {
      reasons.push({
        reason: 'eslint.config.js changed (barrel / import policy)',
        hint: DOC_HINTS.eslint,
      })
    }
  }

  const uniqueReasons = []
  const seen = new Set()
  for (const r of reasons) {
    const key = `${r.reason}|${r.hint}`
    if (seen.has(key)) continue
    seen.add(key)
    uniqueReasons.push(r)
  }

  if (!uniqueReasons.length) {
    console.log('check-docs-updated: no structural changes — skip')
    return
  }

  if (hasDocsChanged) {
    console.log(
      WORKING_TREE
        ? 'check-docs-updated: structural changes with docs/ updated — OK'
        : 'check-docs-updated: structural changes with docs/ staged — OK',
    )
    return
  }

  console.error('\ncheck-docs-updated: FAILED\n')
  console.error(
    WORKING_TREE
      ? 'Working-tree changes affect project structure or public contracts but no docs/ files were updated.\n'
      : 'This commit changes project structure or public contracts but does not stage any docs/ changes.\n',
  )
  for (const r of uniqueReasons) {
    console.error(`  • ${r.reason}`)
    console.error(`    → ${r.hint}`)
  }
  console.error(
    WORKING_TREE
      ? '\nUpdate at least one file under docs/ (e.g. docs/ARCHITECTURE.md, docs/unified/ARCHITECTURE.md, docs/README.md).\n'
      : '\nStage at least one file under docs/ (e.g. docs/ARCHITECTURE.md, docs/unified/ARCHITECTURE.md, docs/README.md).\n',
  )
  process.exit(1)
}

main()
