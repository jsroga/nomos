import { NextResponse } from 'next/server'
import { ProjectForbidden } from '@/shared/auth/project-scope'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { HttpStatus } from '@/shared/data/constants/protocol'

/**
 * `ProjectForbidden` → 404; a 403 would confirm the project exists.
 *
 * Pass to `.catch()` on a scope mint, then narrow with `instanceof NextResponse`.
 * Anything that is not a forbidden project is rethrown, so a real fault still
 * surfaces as a fault rather than as a missing project.
 */
export function toProjectNotFound(error: unknown): NextResponse {
  if (error instanceof ProjectForbidden) {
    return NextResponse.json({ error: API_ERROR.PROJECT_NOT_FOUND }, { status: HttpStatus.NOT_FOUND })
  }
  throw error
}
