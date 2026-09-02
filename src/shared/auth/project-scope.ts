/**
 * `ProjectScope` — proof that the caller owns a project, as a type.
 *
 * Every tenancy hole this codebase had was the same shape: a function took a
 * bare `projectId: string`, and somewhere up the call chain nobody remembered
 * to check it. Adding checks fixes today's holes; it does not stop tomorrow's,
 * because a `string` carries no evidence of having been verified.
 *
 * A repository or use case that takes a `ProjectScope` cannot be called without
 * one, and the only way to obtain one is `projectScope()`, which does the check.
 * A route that forgets therefore fails to compile rather than failing in
 * production. This is the control ADR 0001 chose over RLS, and it is stronger
 * for the same reason: it fires at build time.
 *
 * Scopes are request-lifetime. A scope proves ownership *at the moment it was
 * minted*; caching one across requests reintroduces the bug with extra steps.
 */
import { verifyProjectAccess } from '@/shared/auth/project-access'
import {
  PROJECT_SCOPE_BRAND_NAME,
  PROJECT_FORBIDDEN_MESSAGE,
  PROJECT_SCOPE_LOG,
  SystemScopeReason,
} from '@/shared/auth/constants/project-scope'

export { SystemScopeReason }

/**
 * A real, module-private symbol rather than a `declare`d type-only brand.
 * It is never exported, so the token is unforgeable at runtime as well as at
 * compile time — an object literal cannot reach this key at all.
 */
const projectScopeBrand: unique symbol = Symbol(PROJECT_SCOPE_BRAND_NAME)

/**
 * A verified project. Structurally a pair of ids, but the brand means it cannot
 * be constructed by writing an object literal — only `projectScope()` and
 * `systemScope()` produce one.
 */
export interface ProjectScope {
  readonly projectId: string
  readonly userId: string
  readonly [projectScopeBrand]: true
}

/** Raised when the caller does not own the project. Routes map this to 404. */
export class ProjectForbidden extends Error {
  constructor() {
    super(PROJECT_FORBIDDEN_MESSAGE)
  }
}

function brand(projectId: string, userId: string): ProjectScope {
  // The brand is a compile-time marker with no runtime representation, so the
  // object is built once here and nowhere else.
  return Object.freeze({ projectId, userId, [projectScopeBrand]: true as const })
}

/**
 * The only constructor. Verifies ownership or throws.
 *
 * @throws ProjectForbidden — map to 404, never 403: a 403 confirms the project exists.
 */
export async function projectScope(projectId: string, userId: string): Promise<ProjectScope> {
  if (!(await verifyProjectAccess(projectId, userId))) throw new ProjectForbidden()
  return brand(projectId, userId)
}

/**
 * `projectScope` answering `null` instead of throwing, for routes that each
 * refuse with their own status. The scope is still the only way to proceed.
 */
export async function tryProjectScope(
  projectId: string,
  userId: string
): Promise<ProjectScope | null> {
  return (await verifyProjectAccess(projectId, userId)) ? brand(projectId, userId) : null
}

/**
 * A scope for work with no user behind it — a Trigger task persisting its own
 * output, or a smoke run. Requires a stated reason and logs every acquisition,
 * so the escape hatch is countable rather than invisible; `systemScopeSites` in
 * `.quality-ratchet.json` tracks it.
 */
export function systemScope(projectId: string, reason: SystemScopeReason): ProjectScope {
  console.info(`${PROJECT_SCOPE_LOG.SYSTEM_ACQUIRED} ${projectId}: ${reason}`)
  return brand(projectId, SYSTEM_USER_ID)
}

/** Sentinel owner for system-initiated work; never a real user. */
export const SYSTEM_USER_ID = 'system'
