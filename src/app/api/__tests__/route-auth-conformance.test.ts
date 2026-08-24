import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { PUBLIC_API_PATHS, isPublicApiPath } from '@/shared/auth/constants/public-api-paths'

/**
 * Gate A4 — every route establishes a session, or is an explicit public decision.
 *
 * Deliberately *not* "every route must have a test file": that is an artifact
 * gate, satisfiable with an empty test. This enumerates the real route tree and
 * checks each handler reaches an auth idiom, so a new unauthenticated route
 * fails here the moment it is added.
 *
 * A statically-detectable idiom is required rather than an invocation, because
 * importing 100+ route modules pulls in the whole server graph. The dynamic
 * `await import('@/shared/auth/auth')` form is matched too — that indirection is
 * exactly what hid `entities/resolve` from the original audit.
 */
const API_ROOT = path.join(process.cwd(), 'src/app/api')

const AUTH_IDIOMS = [
  'withAuth',
  'requireAuth',
  'requireAuthedSession',
  'getUserSession',
  'supabase.auth.getUser',
  'validateApiKey',
  'requireMcpUser',
  'isAdminUser',
]

function routeFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue
      found.push(...routeFiles(full))
    } else if (entry.name === 'route.ts') {
      found.push(full)
    }
  }
  return found
}

/** `/api/storyteller/episodes/[episodeId]` for a route.ts path. */
function apiPathOf(file: string): string {
  const rel = path.relative(API_ROOT, path.dirname(file))
  return `/api${rel === '.' ? '' : `/${rel.split(path.sep).join('/')}`}`
}

/** Route file plus the sibling helpers it delegates to (`_lib`, `*-handler.ts`). */
function authSurfaceOf(file: string): string {
  const dir = path.dirname(file)
  let text = fs.readFileSync(file, 'utf8')
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory() && entry.name === '_lib') {
      for (const child of fs.readdirSync(full)) {
        if (child.endsWith('.ts')) text += fs.readFileSync(path.join(full, child), 'utf8')
      }
    } else if (entry.isFile() && entry.name.endsWith('.ts') && entry.name !== 'route.ts') {
      text += fs.readFileSync(full, 'utf8')
    }
  }
  return text
}

const ROUTES = routeFiles(API_ROOT).map(file => ({
  file,
  apiPath: apiPathOf(file),
  source: authSurfaceOf(file),
}))

describe('every API route is authenticated or explicitly public', () => {
  it('finds the route tree', () => {
    expect(ROUTES.length).toBeGreaterThan(50)
  })

  it.each(ROUTES.filter(route => !isPublicApiPath(route.apiPath)))(
    '$apiPath establishes a session',
    ({ apiPath, source }) => {
      const hasAuth = AUTH_IDIOMS.some(idiom => source.includes(idiom))
      expect(
        hasAuth,
        `${apiPath} reaches no auth idiom. Add one, or add it to PUBLIC_API_PATHS with a stated reason.`
      ).toBe(true)
    }
  )

  it('every public path still exists as a route', () => {
    const declared = ROUTES.map(route => route.apiPath)
    for (const publicPath of PUBLIC_API_PATHS) {
      expect(
        declared.some(apiPath => apiPath === publicPath || apiPath.startsWith(`${publicPath}/`)),
        `${publicPath} is allowlisted as public but no route.ts serves it — stale entry`
      ).toBe(true)
    }
  })

  it('rejects a naive prefix match', () => {
    // `/api/authorise` must not be treated as public by the `/api/auth/*` entries.
    expect(isPublicApiPath('/api/authorise')).toBe(false)
    expect(isPublicApiPath('/api/auth/signin')).toBe(true)
  })
})
