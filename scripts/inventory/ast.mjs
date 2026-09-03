/**
 * TypeScript AST walk for inventory identities.
 *
 * Identity is `file::kind::symbol::statementOrdinal`. Whitespace and comment-only
 * edits do not change the set: ordinals are statement order, not line numbers.
 * A line-split import of the same module is the same identity.
 *
 * Classify text is the node's own signature so a parent call does not inherit
 * nested matches. Inventory keeps the first match per (file, statement, bucket)
 * so nested guards on one statement do not outgrow the old line-based ratchet.
 */

import ts from 'typescript'
import { readFileSync } from 'node:fs'

export const AstKind = {
  Import: 'import',
  Call: 'call',
  Property: 'property',
  Env: 'env',
  Comment: 'comment',
}

function calleeSymbol(node, sourceFile) {
  const expression = node.expression
  if (ts.isIdentifier(expression)) return expression.text
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text
  return expression.getText(sourceFile).slice(0, 80)
}

function commentPrefix(sourceFile, node) {
  const text = sourceFile.text
  const ranges = [
    ...(ts.getLeadingCommentRanges(text, node.getFullStart()) ?? []),
    ...(ts.getTrailingCommentRanges(text, node.getEnd()) ?? []),
  ]
  return ranges.map(range => text.slice(range.pos, range.end)).join(' ')
}

function callSnippet(node, sourceFile) {
  const expression = node.expression
  if (ts.isPropertyAccessExpression(expression)) {
    const objectText = expression.expression.getText(sourceFile)
    const name = expression.name.text
    if (name === 'any') return `${objectText}.any()`
    if (name === 'passthrough') return `${commentPrefix(sourceFile, node)} .passthrough()`
    if (name === 'safeParse') return '.safeParse('
    return `.${name}(`
  }
  if (ts.isIdentifier(expression)) {
    const first = node.arguments[0]
    if (
      (expression.text === 'task' || expression.text === 'schemaTask') &&
      first &&
      ts.isObjectLiteralExpression(first)
    ) {
      return `${expression.text}({`
    }
    return `${expression.text}(`
  }
  return `${calleeSymbol(node, sourceFile)}(`
}

function isClassifiableStatement(node) {
  return (
    ts.isImportDeclaration(node) ||
    ts.isExportDeclaration(node) ||
    ts.isExportAssignment(node) ||
    ts.isExpressionStatement(node) ||
    ts.isVariableStatement(node) ||
    ts.isReturnStatement(node) ||
    ts.isThrowStatement(node) ||
    ts.isExpressionStatement(node)
  )
}

function visitNodes(sourceFile, onNode) {
  let statementOrdinal = 0
  let currentOrdinal = 0

  const visit = node => {
    if (isClassifiableStatement(node)) {
      statementOrdinal += 1
      currentOrdinal = statementOrdinal
    }

    const ordinal = currentOrdinal

    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text
      onNode({
        kind: AstKind.Import,
        symbol: specifier,
        text: `from '${specifier}'`,
        statementOrdinal: ordinal,
      })
    } else if (ts.isCallExpression(node)) {
      onNode({
        kind: AstKind.Call,
        symbol: calleeSymbol(node, sourceFile),
        text: callSnippet(node, sourceFile),
        statementOrdinal: ordinal,
      })
    } else if (ts.isPropertyAccessExpression(node)) {
      const objectText = node.expression.getText(sourceFile)
      if (objectText === 'process.env' && ts.isIdentifier(node.name)) {
        const assigned =
          node.parent &&
          ts.isBinaryExpression(node.parent) &&
          node.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
        onNode({
          kind: AstKind.Env,
          symbol: node.name.text,
          text: assigned
            ? `process.env.${node.name.text} = assigned`
            : `process.env.${node.name.text}`,
          statementOrdinal: ordinal,
        })
      } else if (!ts.isCallExpression(node.parent) || node.parent.expression !== node) {
        onNode({
          kind: AstKind.Property,
          symbol: node.name.getText(sourceFile),
          text: `.${node.name.getText(sourceFile)}`,
          statementOrdinal: ordinal,
        })
      }
    } else if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
      onNode({
        kind: AstKind.Property,
        symbol: node.name.text,
        text: `${node.name.text}:`,
        statementOrdinal: ordinal,
      })
    } else if (ts.isShorthandPropertyAssignment(node)) {
      onNode({
        kind: AstKind.Property,
        symbol: node.name.text,
        text: `${node.name.text}:`,
        statementOrdinal: ordinal,
      })
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
}

export function walkSourceFile(relativePath, source) {
  const scriptKind = relativePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sourceFile = ts.createSourceFile(
    relativePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  )
  const nodes = []
  visitNodes(sourceFile, node => {
    nodes.push({ file: relativePath, ...node })
  })

  const commentBlocks = source.match(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g) ?? []
  for (const text of commentBlocks) {
    nodes.push({
      file: relativePath,
      kind: AstKind.Comment,
      symbol: 'inline',
      text,
      statementOrdinal: 0,
    })
  }

  return nodes
}

export function walkFile(relativePath) {
  return walkSourceFile(relativePath, readFileSync(relativePath, 'utf8'))
}

export function identityOf(node) {
  return `${node.file}::${node.kind}::${node.symbol}::${node.statementOrdinal ?? 0}`
}

export function statementBucketKey(file, statementOrdinal, bucket) {
  return `${file}::${statementOrdinal}::${bucket}`
}
