#!/usr/bin/env node
/**
 * Remove private declarations that have zero references outside their definition site.
 * Driven by a pre-computed dead list (see quality-improvement dead-code sweep).
 */
import { Project, SyntaxKind } from 'ts-morph'
import fs from 'node:fs'

const deadList = JSON.parse(
  fs.readFileSync(new URL('./dead-decls-batch.json', import.meta.url), 'utf8')
)

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
  skipAddingFilesFromTsConfig: true,
})

for (const { file, name } of deadList) {
  project.addSourceFileAtPathIfExists(file)
}

let removed = 0
let missed = []

for (const { file, name } of deadList) {
  const sourceFile = project.getSourceFile(file)
  if (!sourceFile) {
    missed.push({ file, name, reason: 'file not found' })
    continue
  }

  const decl =
    sourceFile.getFunction(name) ??
    sourceFile.getInterface(name) ??
    sourceFile.getTypeAlias(name) ??
    sourceFile.getVariableDeclaration(name)

  if (!decl) {
    missed.push({ file, name, reason: 'declaration not found' })
    continue
  }

  // Remove attached JSDoc / section comments above
  const node = decl.getKind() === SyntaxKind.VariableDeclaration ? decl : decl
  const statement =
    decl.getKind() === SyntaxKind.VariableDeclaration
      ? decl.getVariableStatement() ?? decl
      : decl

  const startLine = statement.getStartLineNumber()
  const lines = sourceFile.getFullText().split('\n')
  let removeFrom = startLine - 1

  // Walk upward: blank lines and block/line comments
  while (removeFrom > 0) {
    const prev = lines[removeFrom - 1]
    const trimmed = prev.trim()
    if (trimmed === '') {
      removeFrom--
      continue
    }
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/**') || trimmed === '*/') {
      removeFrom--
      continue
    }
    break
  }

  if (statement.getKind() === SyntaxKind.VariableStatement) {
    statement.remove()
  } else {
    decl.remove()
  }

  // Clean leftover blank lines at removal site
  const text = sourceFile.getFullText()
  const cleaned = text.replace(/\n{3,}/g, '\n\n')
  if (cleaned !== text) sourceFile.replaceWithText(cleaned)

  removed++
}

project.saveSync()

console.log(`Removed ${removed}/${deadList.length} declarations`)
if (missed.length) {
  console.error('Missed:', missed)
  process.exit(1)
}
