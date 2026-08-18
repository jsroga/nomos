/**
 * Public OpenAPI coverage: every App Router API route.ts is in public/openapi.json
 * or on the omit list (SSE / admin / workspace-only).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { isOmittedOpenApiPath } from './route-coverage-omit'

export enum OpenApiRouteFile {
  Name = 'route.ts',
}

export enum OpenApiSpecRelative {
  Path = 'public/openapi.json',
}

const HTTP_EXPORT = /\bexport\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b/g

export type OpenApiCoverageGap = {
  file: string
  path: string
  methods: string[]
  reason: string
}

export function fileToOpenApiPath(relativeFile: string): string {
  const posix = relativeFile.split(path.sep).join('/')
  const stripped = posix
    .replace(/^src\/app\/api/, '')
    .replace(/\/route\.ts$/, '')
  const withParams = stripped.replace(/\[([^\]]+)\]/g, '{$1}')
  return withParams.startsWith('/') ? withParams : `/${withParams}`
}

export function listApiRouteFiles(repoRoot: string): string[] {
  const apiRoot = path.join(repoRoot, 'src', 'app', 'api')
  const files: string[] = []
  const walk = (dir: string) => {
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
        continue
      }
      if (entry.name === OpenApiRouteFile.Name) {
        files.push(path.relative(repoRoot, full).split(path.sep).join('/'))
      }
    }
  }
  walk(apiRoot)
  return files.sort()
}

function exportedHttpMethods(absFile: string): string[] {
  const source = readFileSync(absFile, 'utf8')
  const found = new Set<string>()
  for (const match of source.matchAll(HTTP_EXPORT)) {
    const name = match[1]
    if (name) found.add(name.toLowerCase())
  }
  return [...found]
}

function specPaths(spec: unknown): Record<string, Record<string, unknown>> {
  if (typeof spec !== 'object' || spec === null) return {}
  if (!('paths' in spec)) return {}
  const { paths } = spec
  if (typeof paths !== 'object' || paths === null) return {}
  const out: Record<string, Record<string, unknown>> = {}
  for (const [key, value] of Object.entries(paths)) {
    if (typeof value === 'object' && value !== null) {
      out[key] = value
    }
  }
  return out
}

export function findOpenApiCoverageGaps(repoRoot: string): OpenApiCoverageGap[] {
  const specFile = path.join(repoRoot, OpenApiSpecRelative.Path)
  const parsed: unknown = existsSync(specFile)
    ? JSON.parse(readFileSync(specFile, 'utf8'))
    : {}
  const documented = specPaths(parsed)
  const gaps: OpenApiCoverageGap[] = []

  for (const file of listApiRouteFiles(repoRoot)) {
    const apiPath = fileToOpenApiPath(file)
    if (isOmittedOpenApiPath(apiPath)) continue
    const methods = exportedHttpMethods(path.join(repoRoot, file))
    const item = documented[apiPath]
    if (!item) {
      gaps.push({
        file,
        path: apiPath,
        methods,
        reason: `not in ${OpenApiSpecRelative.Path} — register Zod + path, then npm run openapi:generate`,
      })
    }
  }

  return gaps
}

export function formatOpenApiCoverageGaps(gaps: OpenApiCoverageGap[]): string {
  return gaps
    .map(gap => `${gap.file} → ${gap.methods.join('|') || 'path'} ${gap.path}: ${gap.reason}`)
    .join('\n')
}

export function assertOpenApiRouteCoverage(repoRoot: string): boolean {
  const gaps = findOpenApiCoverageGaps(repoRoot)
  if (gaps.length === 0) return true
  console.error('openapi:coverage failed — undocumented API routes:\n')
  console.error(formatOpenApiCoverageGaps(gaps))
  console.error(
    '\nPublic REST: register in domain core/io/openapi-routes.ts (or shared), then npm run openapi:generate.',
  )
  console.error('Workspace-only / SSE: add a prefix to scripts/openapi/route-coverage-omit.ts.')
  return false
}
