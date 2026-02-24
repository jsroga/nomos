#!/usr/bin/env node
/**
 * Generates docs/DEAD-CODE.md from knip-report.json
 *
 * Self-healing: this report auto-updates on every push/PR via GitHub Actions.
 * Developers can check docs/DEAD-CODE.md to see what's unused and clean it up.
 */

import { readFileSync, writeFileSync } from 'node:fs'

const raw = JSON.parse(readFileSync('knip-report.json', 'utf8'))

const now = new Date().toISOString().split('T')[0]
const lines = []

// Knip JSON v5 format: { files: string[], issues: Issue[] }
const unusedFiles = raw.files || []
const issues = raw.issues || []

// Aggregate issues by category
const unlisted = []
const unresolved = []
const unusedExports = []
const unusedTypes = []
const unusedEnumMembers = []

for (const issue of issues) {
  for (const dep of issue.unlisted || []) {
    unlisted.push({ name: dep.name, file: issue.file, line: dep.line })
  }
  for (const imp of issue.unresolved || []) {
    unresolved.push({ name: imp.name, file: issue.file, line: imp.line })
  }
  for (const exp of issue.exports || []) {
    unusedExports.push({ name: exp.name, file: issue.file, line: exp.line })
  }
  for (const t of issue.types || []) {
    unusedTypes.push({ name: t.name, file: issue.file, line: t.line })
  }
  if (issue.enumMembers && typeof issue.enumMembers === 'object') {
    for (const [enumName, members] of Object.entries(issue.enumMembers)) {
      for (const member of Array.isArray(members) ? members : [members]) {
        unusedEnumMembers.push({
          name: `${enumName}.${member.name || member}`,
          file: issue.file,
        })
      }
    }
  }
}

const counts = {
  'Unused files': unusedFiles.length,
  'Unlisted dependencies': unlisted.length,
  'Unresolved imports': unresolved.length,
  'Unused exports': unusedExports.length,
  'Unused types': unusedTypes.length,
  'Unused enum members': unusedEnumMembers.length,
}
const total = Object.values(counts).reduce((a, b) => a + b, 0)

lines.push(`# Dead Code Report`)
lines.push(``)
lines.push(`> Auto-generated on ${now} by [Knip](https://knip.dev). Do not edit manually.`)
lines.push(`> Updates automatically via CI on every push to main and on PRs.`)
lines.push(``)

lines.push(`## Summary`)
lines.push(``)
lines.push(`| Category | Count |`)
lines.push(`|----------|-------|`)
for (const [key, count] of Object.entries(counts)) {
  if (count > 0) lines.push(`| ${key} | ${count} |`)
}
lines.push(`| **Total** | **${total}** |`)
lines.push(``)

if (unusedFiles.length) {
  lines.push(`## Unused Files`)
  lines.push(``)
  for (const file of unusedFiles) lines.push(`- \`${file}\``)
  lines.push(``)
}

if (unlisted.length) {
  lines.push(`## Unlisted Dependencies`)
  lines.push(``)
  lines.push(`Imported but missing from package.json.`)
  lines.push(``)
  for (const d of unlisted) lines.push(`- \`${d.name}\` in \`${d.file}:${d.line}\``)
  lines.push(``)
}

if (unresolved.length) {
  lines.push(`## Unresolved Imports`)
  lines.push(``)
  lines.push(`Import paths that don't resolve to any module.`)
  lines.push(``)
  for (const d of unresolved) lines.push(`- \`${d.name}\` in \`${d.file}:${d.line}\``)
  lines.push(``)
}

if (unusedExports.length) {
  lines.push(`## Unused Exports`)
  lines.push(``)
  lines.push(`Exported but never imported. Remove \`export\` or delete.`)
  lines.push(``)
  lines.push(`| Export | File |`)
  lines.push(`|--------|------|`)
  for (const e of unusedExports) lines.push(`| \`${e.name}\` | \`${e.file}:${e.line}\` |`)
  lines.push(``)
}

if (unusedTypes.length) {
  lines.push(`## Unused Types`)
  lines.push(``)
  for (const t of unusedTypes) lines.push(`- \`${t.name}\` in \`${t.file}:${t.line}\``)
  lines.push(``)
}

if (unusedEnumMembers.length) {
  lines.push(`## Unused Enum Members`)
  lines.push(``)
  for (const e of unusedEnumMembers) lines.push(`- \`${e.name}\` in \`${e.file}\``)
  lines.push(``)
}

lines.push(`## How to Fix`)
lines.push(``)
lines.push(`\`\`\`bash`)
lines.push(`# Run locally`)
lines.push(`npx knip`)
lines.push(``)
lines.push(`# Only dependencies`)
lines.push(`npx knip --dependencies`)
lines.push(``)
lines.push(`# Only exports`)
lines.push(`npx knip --exports`)
lines.push(`\`\`\``)
lines.push(``)
lines.push(`False positives? Update \`knip.json\`:`)
lines.push(`- **Files**: add to \`entry\` or \`ignore\``)
lines.push(`- **Dependencies**: add to \`ignoreDependencies\``)
lines.push(`- **Exports**: ensure consuming code is listed in \`entry\``)
lines.push(``)

writeFileSync('docs/DEAD-CODE.md', lines.join('\n'))
console.log(`docs/DEAD-CODE.md generated (${total} issues)`)
