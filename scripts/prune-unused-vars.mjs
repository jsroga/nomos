/**
 * Guarded unused-variable codemod.
 *
 * Source of truth = ESLint's `unused-imports/no-unused-vars` reports (scope-accurate,
 * fast). ts-morph is used ONLY to edit by position (no type-checker pass → no OOM).
 *
 * Fixes (safe by construction):
 *  - unused PARAM / caught error      -> prefix `_` (no signature/behaviour change; config ignores ^_)
 *  - unused LOCAL `const/let x = init` (single declarator, non-destructured, non-exported):
 *      • init may have side effects (call/await/new/tagged-template) -> keep expression, drop binding
 *      • otherwise -> remove the statement
 *  - everything else (functions, classes, imports, destructuring) -> SKIP (manual)
 *
 * Usage: node scripts/prune-unused-vars.mjs "<glob>" [--apply]
 */
import { execSync } from 'node:child_process'
import { Project, Node } from 'ts-morph'

const glob = process.argv[2]
const APPLY = process.argv.includes('--apply')
if (!glob) {
  console.error('Provide a glob.')
  process.exit(1)
}

// 1) Get unused-var reports from ESLint (JSON).
let report
try {
  const out = execSync(`npx eslint "${glob}" --format json`, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  report = JSON.parse(out)
} catch (e) {
  // eslint exits non-zero when it finds problems; stdout still holds the JSON
  report = JSON.parse(e.stdout)
}

const project = new Project({ skipAddingFilesFromTsConfig: true, skipFileDependencyResolution: true })

let prefixed = 0
let removed = 0
const skipped = []

for (const file of report) {
  const msgs = file.messages.filter(m => m.ruleId && m.ruleId.includes('no-unused-vars'))
  if (msgs.length === 0) continue

  const sf = project.addSourceFileAtPath(file.filePath)
  const ts = sf.compilerNode

  // Resolve each report to an action node first (positions from original text).
  const actions = []
  for (const m of msgs) {
    const pos = ts.getPositionOfLineAndCharacter(m.line - 1, m.column - 1)
    const node = sf.getDescendantAtPos(pos)
    if (!node || !Node.isIdentifier(node)) {
      skipped.push(`${file.filePath}:${m.line} (${m.message})`)
      continue
    }
    if (node.getText().startsWith('_')) continue
    const parent = node.getParent()

    // unused param
    if (Node.isParameterDeclaration(parent) && parent.getNameNode() === node) {
      actions.push({ start: node.getStart(), run: () => node.replaceWithText('_' + node.getText()) })
      prefixed++
      continue
    }
    // variable declaration: either a catch binding or a real local
    if (Node.isVariableDeclaration(parent) && parent.getNameNode() === node) {
      const grand = parent.getParent()
      if (grand && Node.isCatchClause(grand)) {
        actions.push({ start: node.getStart(), run: () => node.replaceWithText('_' + node.getText()) })
        prefixed++
        continue
      }
      const stmt = grand?.getParent() // VariableStatement
      if (stmt && Node.isVariableStatement(stmt) && !stmt.isExported() && stmt.getDeclarations().length === 1) {
        const init = parent.getInitializer()
        // Only auto-remove when the initializer has no call/await/new (can't carry a side effect).
        // Anything with a call is left for manual review — never leave a bare dead expression.
        const hasCall =
          init &&
          (Node.isCallExpression(init) ||
            Node.isAwaitExpression(init) ||
            Node.isNewExpression(init) ||
            Node.isTaggedTemplateExpression(init) ||
            init.getDescendantsOfKind?.(Node.SyntaxKind?.CallExpression)?.length)
        if (hasCall) {
          skipped.push(`${file.filePath}:${m.line} (call initializer — manual)`)
          continue
        }
        actions.push({
          start: stmt.getStart(),
          run: () => {
            stmt.remove()
            removed++
          },
        })
        continue
      }
    }
    skipped.push(`${file.filePath}:${m.line} (${m.message})`)
  }

  // Apply descending by position so earlier offsets stay valid.
  actions.sort((a, b) => b.start - a.start)
  for (const a of actions) {
    try {
      a.run()
    } catch (e) {
      skipped.push(`${file.filePath} apply-failed: ${e.message}`)
    }
  }

  if (APPLY) sf.saveSync()
}

console.log(
  `params/catch→_: ${prefixed}  locals removed: ${removed}  skipped(manual): ${skipped.length}  ${APPLY ? '(written)' : '(dry-run)'}`
)
if (process.argv.includes('--verbose')) skipped.slice(0, 40).forEach(s => console.log('  skip', s))
