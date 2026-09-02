/**
 * Project ownership — the one check that answers "may this user touch this
 * project's data".
 *
 * Lives in shared/ rather than in the storyteller domain because every layer
 * needs it: routes, jobs, and any future repository. `shared/` may not import
 * `@/domains/*`, so a domain-owned copy is unreachable from `shared/jobs`.
 */
import { db } from '@/db/client'
import { projects } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { isValidProjectId } from '@/shared/auth/security'
import {
  E2E_BYPASS_NODE_ENVS,
  E2E_TEST_USER_ID,
} from '@/shared/auth/constants/project-access'

/** True when the user owns the project. Non-UUID ids are rejected before Postgres (22P02). */
export async function verifyProjectAccess(projectId: string, userId: string): Promise<boolean> {
  if (!isValidProjectId(projectId)) return false

  const [project] = await db
    .select({ userId: projects.userId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  if (!project) return false

  // E2E fixture user, dev/test only — inert in production.
  if (userId === E2E_TEST_USER_ID && E2E_BYPASS_NODE_ENVS.has(process.env.NODE_ENV || '')) {
    return true
  }

  return project.userId === userId
}
