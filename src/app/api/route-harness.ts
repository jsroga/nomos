/**
 * Route contract-test support.
 *
 * Route handlers are where auth, tenancy and validation live, and they were the
 * least-tested layer in the repo. These helpers let a test drive a real handler
 * and assert the contract that matters: anonymous callers are rejected, and a
 * caller who is signed in still cannot reach another tenant's data.
 *
 * Test-only. Never imported by `src/` at runtime — the ESLint boundary and the
 * route-conformance test both treat it as fixture code.
 */
import { NextRequest } from 'next/server'
import { ApiErrorMessage, HttpMethod } from '@/shared/data/constants/protocol'

const CONTENT_TYPE_HEADER = 'content-type'
const CONTENT_TYPE_JSON = 'application/json'

export const E2E_HARNESS_USER = '00000000-0000-4000-8000-0000000000aa'
export const OTHER_TENANT_USER = '00000000-0000-4000-8000-0000000000bb'

export interface HarnessSession {
  user: { id: string; email?: string }
}

/** Mutable state the mocked auth module reads. Reset it in `beforeEach`. */
export const harnessAuth: { session: HarnessSession | null } = { session: null }

/** Mutable state the mocked project-access module reads. */
export const harnessAccess: { granted: boolean } = { granted: true }

export function signIn(userId: string = E2E_HARNESS_USER): void {
  harnessAuth.session = { user: { id: userId } }
}

export function signOut(): void {
  harnessAuth.session = null
}

export function resetHarness(): void {
  signOut()
  harnessAccess.granted = true
}

/** Shape returned by the mocked `@/shared/auth/auth`. */
export function authModuleStub() {
  return {
    getUserSession: async () => ({
      session: harnessAuth.session,
      supabase: harnessAuth.session ? {} : null,
      error: null,
    }),
    requireAuth: async () => ({
      session: harnessAuth.session,
      error: harnessAuth.session ? null : new Error(ApiErrorMessage.UNAUTHORIZED),
    }),
  }
}

/** Shape returned by the mocked `@/shared/auth/project-access`. */
export function projectAccessStub() {
  return { verifyProjectAccess: async () => harnessAccess.granted }
}

interface RequestInit {
  method?: string
  body?: unknown
  query?: Record<string, string>
  url?: string
}

/** Build a NextRequest-shaped object for a handler under test. */
export function routeRequest(init: RequestInit = {}): NextRequest {
  const base = init.url ?? 'https://harness.test/api/route'
  const url = new URL(base)
  for (const [key, value] of Object.entries(init.query ?? {})) {
    url.searchParams.set(key, value)
  }
  // A real NextRequest, not a stand-in: the handlers are typed against it, and
  // constructing the genuine article is cheaper than faking one (which the
  // repo's ban on type assertions would not allow anyway).
  return new NextRequest(url, {
    method: init.method ?? HttpMethod.Get,
    ...(init.body === undefined
      ? {}
      : {
          body: JSON.stringify(init.body),
          headers: { [CONTENT_TYPE_HEADER]: CONTENT_TYPE_JSON },
        }),
  })
}

/** Next 15+ passes route params as a promise. */
export function routeParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return { params: Promise.resolve(params) }
}
