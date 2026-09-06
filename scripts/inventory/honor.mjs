/**
 * Honor-system ratchet consumers — AST / source walks, no `exec grep`.
 *
 * Each function returns the identities (or file paths) the matching JSON
 * counter is supposed to bound. Counts are identity length.
 */

import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import ts from 'typescript'
import { AstKind, identityOf, walkSourceFile } from './ast.mjs'
import { sourceFiles } from './index.mjs'

const SRC = 'src'
const API_ROOT = 'src/app/api'
const OWNED_RUN = 'src/shared/jobs/owned-run.ts'
const PROJECT_SCOPE = 'src/shared/auth/project-scope.ts'
const PERSISTENCE_DIR = 'src/shared/persistence'
const SESSION_EXISTENCE_MARK = 'auth-scope: session-existence-only'
const OWNERSHIP_RE =
  /projectScope|episodeScope|beatScope|characterScope|withProjectScope|verifyProjectAccess|verifyEpisodeAccess|verifyBeatAccess|verifyCharacterAccess|verifyProjectOwnership|listForUser|session\.user\.id|isAdminUser/
const PROJECT_ID_RE = /projectId|project_id/
const DB_CLIENT_SOURCES = new Set(['@/db/client', '@/db'])

function posix(file) {
  return file.split('\\').join('/')
}

function isTestPath(file) {
  const path = posix(file)
  return path.includes('/__tests__/') || path.includes('.test.')
}

function walkFiles(root, predicate) {
  const found = []
  for (const entry of readdirSync(root)) {
    const path = join(root, entry)
    if (statSync(path).isDirectory()) {
      found.push(...walkFiles(path, predicate))
      continue
    }
    if (predicate(path, entry)) found.push(path)
  }
  return found
}

function parseFile(relativePath) {
  const source = readFileSync(relativePath, 'utf8')
  const scriptKind = relativePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  return ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true, scriptKind)
}

function forEachNode(sourceFile, visit) {
  const walk = node => {
    visit(node)
    ts.forEachChild(node, walk)
  }
  walk(sourceFile)
}

export function untaggedRunGracePaths() {
  const sourceFile = parseFile(OWNED_RUN)
  const hits = []
  forEachNode(sourceFile, node => {
    if (!ts.isCallExpression(node)) return
    const expression = node.expression
    const name = ts.isIdentifier(expression)
      ? expression.text
      : ts.isPropertyAccessExpression(expression)
        ? expression.name.text
        : ''
    if (name !== 'isWithinUntaggedGraceWindow') return
    hits.push(`${OWNED_RUN}::call::isWithinUntaggedGraceWindow`)
  })
  return hits
}

export function sessionExistenceOnlyRoutes() {
  const files = walkFiles(API_ROOT, (path, entry) => entry === 'route.ts')
  const hits = []
  for (const file of files) {
    const relativePath = posix(relative(process.cwd(), file))
    const source = readFileSync(file, 'utf8')
    if (!source.includes(SESSION_EXISTENCE_MARK)) continue
    hits.push(`${relativePath}::comment::session-existence-only`)
  }
  return hits
}

export function directDbClientImporters() {
  const hits = []
  for (const file of sourceFiles(SRC)) {
    const relativePath = posix(relative(process.cwd(), file))
    if (isTestPath(relativePath)) continue
    if (relativePath.startsWith(`${PERSISTENCE_DIR}/`) || relativePath === `${PERSISTENCE_DIR}.ts`) {
      continue
    }
    const sourceFile = parseFile(relativePath)
    let matched = false
    forEachNode(sourceFile, node => {
      if (matched) return
      if (!ts.isImportDeclaration(node) || !node.moduleSpecifier) return
      if (!ts.isStringLiteral(node.moduleSpecifier)) return
      if (!DB_CLIENT_SOURCES.has(node.moduleSpecifier.text)) return
      matched = true
    })
    if (matched) hits.push(`${relativePath}::import::db-client`)
  }
  return hits
}

function isServiceRoleSymbol(node) {
  if (ts.isIdentifier(node) && node.text === 'supabaseAdmin') return true
  if (!ts.isCallExpression(node)) return false
  const expression = node.expression
  return ts.isIdentifier(expression) && expression.text === 'createSupabaseServiceClient'
}

export function serviceRoleClientSites() {
  const hits = []
  for (const file of sourceFiles(SRC)) {
    const relativePath = posix(relative(process.cwd(), file))
    if (isTestPath(relativePath)) continue
    if (relativePath.startsWith(`${PERSISTENCE_DIR}/`)) continue
    const sourceFile = parseFile(relativePath)
    let matched = false
    forEachNode(sourceFile, node => {
      if (matched) return
      if (!isServiceRoleSymbol(node)) return
      matched = true
    })
    if (matched) hits.push(`${relativePath}::call::service-role`)
  }
  return hits
}

export function systemScopeSites() {
  const hits = []
  for (const file of sourceFiles(SRC)) {
    const relativePath = posix(relative(process.cwd(), file))
    if (isTestPath(relativePath)) continue
    if (relativePath === PROJECT_SCOPE) continue
    const source = readFileSync(relativePath, 'utf8')
    for (const node of walkSourceFile(relativePath, source)) {
      if (node.kind !== AstKind.Call || node.symbol !== 'systemScope') continue
      hits.push(identityOf(node))
    }
  }
  return hits
}

function directoryHasOwnershipHelper(dir) {
  const files = walkFiles(dir, (_path, entry) => entry.endsWith('.ts') || entry.endsWith('.tsx'))
  return files.some(file => OWNERSHIP_RE.test(readFileSync(file, 'utf8')))
}

export function routesTakingProjectIdWithoutOwnershipCheck() {
  const files = walkFiles(API_ROOT, (path, entry) => entry === 'route.ts')
  const hits = []
  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    if (!PROJECT_ID_RE.test(source)) continue
    if (directoryHasOwnershipHelper(dirname(file))) continue
    const relativePath = posix(relative(process.cwd(), file))
    hits.push(`${relativePath}::route::project-id-without-ownership`)
  }
  return hits
}

function isConstantsPath(relativePath) {
  return `/${posix(relativePath)}`.includes('/constants/')
}

export function constantsFilesWithFunctions() {
  const hits = []
  for (const file of sourceFiles(SRC)) {
    const relativePath = posix(relative(process.cwd(), file))
    if (isTestPath(relativePath)) continue
    if (!isConstantsPath(relativePath)) continue
    const sourceFile = parseFile(relativePath)
    let matched = false
    forEachNode(sourceFile, node => {
      if (matched) return
      if (ts.isFunctionDeclaration(node)) matched = true
    })
    if (matched) hits.push(`${relativePath}::function::constants`)
  }
  return hits
}

export function evalSkipCommits() {
  const output = execFileSync('git', ['log', '--grep=^Eval-Skip:', '--oneline'], {
    encoding: 'utf8',
  })
  const lines = output.split('\n').filter(line => line.trim().length > 0)
  return lines.map(line => `git::eval-skip::${line.split(' ')[0]}`)
}

export function honorCounts() {
  return {
    untaggedRunGracePaths: untaggedRunGracePaths().length,
    sessionExistenceOnlyRoutes: sessionExistenceOnlyRoutes().length,
    directDbClientImporters: directDbClientImporters().length,
    serviceRoleClientSites: serviceRoleClientSites().length,
    systemScopeSites: systemScopeSites().length,
    routesTakingProjectIdWithoutOwnershipCheck: routesTakingProjectIdWithoutOwnershipCheck().length,
    evalSkipCommits: evalSkipCommits().length,
    constantsFilesWithFunctions: constantsFilesWithFunctions().length,
  }
}

export function honorIdentities() {
  return [
    ...untaggedRunGracePaths(),
    ...sessionExistenceOnlyRoutes(),
    ...directDbClientImporters(),
    ...serviceRoleClientSites(),
    ...systemScopeSites(),
    ...routesTakingProjectIdWithoutOwnershipCheck(),
    ...evalSkipCommits(),
    ...constantsFilesWithFunctions(),
  ]
}
