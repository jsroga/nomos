#!/usr/bin/env node
/**
 * Typecheck gate: file line count + cyclomatic complexity (mirrors ESLint limits).
 * Run via `npm run typecheck` after `tsc --noEmit`.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'typescript'
import limits from './code-metrics-limits.cjs'

const DEFAULT_ROOTS = ['src']
const IGNORE_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  'playwright-report',
  'test-results',
])

/** @param {string} filePath */
function countFileLines(filePath) {
  const lines = readFileSync(filePath, 'utf8').split('\n')
  const { skipBlankLines, skipComments } = limits.fileLines

  if (!skipBlankLines && !skipComments) {
    return lines.length
  }

  let count = 0
  for (const line of lines) {
    const trimmed = line.trim()
    if (skipBlankLines && trimmed.length === 0) continue
    if (skipComments && (trimmed.startsWith('//') || trimmed.startsWith('/*'))) continue
    count += 1
  }
  return count
}

/** @param {ts.Node} node */
function isFunctionNode(node) {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  )
}

/** @param {ts.Node} node @param {ts.SourceFile} sourceFile */
function getFunctionLabel(node, sourceFile) {
  if (ts.isFunctionDeclaration(node) && node.name) {
    return `function '${node.name.text}'`
  }
  if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
    return `method '${node.name.text}'`
  }
  if (ts.isConstructorDeclaration(node)) {
    return "constructor"
  }
  if (ts.isArrowFunction(node)) {
    return 'arrow function'
  }
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
  return `function at line ${line + 1}`
}

/** @param {ts.Node} fnNode */
function computeComplexity(fnNode) {
  let complexity = 1

  /** @param {ts.Node} node */
  function walk(node) {
    if (isFunctionNode(node) && node !== fnNode) {
      return
    }

    if (
      ts.isIfStatement(node) ||
      ts.isForStatement(node) ||
      ts.isForInStatement(node) ||
      ts.isForOfStatement(node) ||
      ts.isWhileStatement(node) ||
      ts.isDoStatement(node) ||
      ts.isCatchClause(node) ||
      ts.isConditionalExpression(node)
    ) {
      complexity += 1
    }

    if (ts.isCaseClause(node) && node.expression) {
      complexity += 1
    }

    if (ts.isBinaryExpression(node)) {
      const op = node.operatorToken.kind
      if (
        op === ts.SyntaxKind.AmpersandAmpersandToken ||
        op === ts.SyntaxKind.BarBarToken ||
        op === ts.SyntaxKind.AmpersandEqualsToken ||
        op === ts.SyntaxKind.BarEqualsToken ||
        op === ts.SyntaxKind.QuestionQuestionEqualsToken
      ) {
        complexity += 1
      }
    }

    if (ts.isPropertyAccessChain(node) || ts.isElementAccessChain(node) || ts.isCallChain(node)) {
      complexity += 1
    }

    ts.forEachChild(node, walk)
  }

  const body = fnNode.body
  if (body) {
    walk(body)
  }

  return complexity
}

/** @param {ts.SourceFile} sourceFile */
function collectFunctionComplexities(sourceFile) {
  /** @type {{ label: string, line: number, complexity: number }[]} */
  const results = []

  /** @param {ts.Node} node */
  function visit(node) {
    if (isFunctionNode(node)) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
      results.push({
        label: getFunctionLabel(node, sourceFile),
        line: line + 1,
        complexity: computeComplexity(node),
      })
    }

    if (
      ts.isPropertyDeclaration(node) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.initializer.getStart(sourceFile))
      const name = ts.isIdentifier(node.name) ? node.name.text : 'field'
      results.push({
        label: `class field '${name}'`,
        line: line + 1,
        complexity: computeComplexity(node.initializer),
      })
      ts.forEachChild(node, visit)
      return
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return results
}

/** @param {string} dir */
function walkTsFiles(dir) {
  /** @type {string[]} */
  const files = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      if (IGNORE_DIRS.has(entry)) continue
      files.push(...walkTsFiles(full))
      continue
    }
    if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full)
    }
  }
  return files
}

/**
 * @param {{ files?: string[], roots?: string[] }} [options]
 * @returns {{ warnings: string[], errors: string[] }}
 */
export function checkCodeMetrics(options = {}) {
  const roots = options.roots ?? DEFAULT_ROOTS
  const files =
    options.files ??
    roots.flatMap((root) => (statSync(root, { throwIfNoEntry: false })?.isDirectory() ? walkTsFiles(root) : []))

  /** @type {string[]} */
  const warnings = []
  /** @type {string[]} */
  const errors = []

  for (const filePath of files) {
    const rel = relative(process.cwd(), filePath).replace(/\\/g, '/')
    const lineCount = countFileLines(filePath)

    if (lineCount > limits.fileLines.error) {
      errors.push(
        `${rel}: file has ${lineCount} lines (error limit ${limits.fileLines.error})`,
      )
    } else if (lineCount > limits.fileLines.warn) {
      warnings.push(
        `${rel}: file has ${lineCount} lines (warn limit ${limits.fileLines.warn})`,
      )
    }

    const sourceText = readFileSync(filePath, 'utf8')
    const scriptKind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, scriptKind)

    for (const fn of collectFunctionComplexities(sourceFile)) {
      if (fn.complexity > limits.complexity.error) {
        errors.push(
          `${rel}:${fn.line} ${fn.label} has complexity ${fn.complexity} (error limit ${limits.complexity.error})`,
        )
      } else if (fn.complexity > limits.complexity.warn) {
        warnings.push(
          `${rel}:${fn.line} ${fn.label} has complexity ${fn.complexity} (warn limit ${limits.complexity.warn})`,
        )
      }
    }
  }

  return { warnings, errors }
}

function main() {
  const { warnings, errors } = checkCodeMetrics()

  if (warnings.length) {
    console.warn(`check-code-metrics: ${warnings.length} warning(s)`)
    for (const message of warnings) {
      console.warn(`  warning ${message}`)
    }
  }

  if (errors.length) {
    console.error(`check-code-metrics: ${errors.length} error(s)`)
    for (const message of errors) {
      console.error(`  error ${message}`)
    }
    process.exit(1)
  }

  console.log('check-code-metrics: OK')
}

import { pathToFileURL } from 'node:url'

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href

if (isDirectRun) {
  main()
}
