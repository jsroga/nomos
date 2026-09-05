import { NextResponse } from 'next/server'
import { ProjectForbidden, projectScope, type ProjectScope } from '@/shared/auth/project-scope'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { HttpStatus } from '@/shared/data/constants/protocol'

/**
 * `ProjectForbidden` → 404; a 403 would confirm the project exists.
 * Anything else rethrows, so a real fault does not read as a missing project.
 */
export async function awaitProjectScope(
  projectId: string,
  userId: string
): Promise<ProjectScope | NextResponse> {
  try {
    return await projectScope(projectId, userId)
  } catch (error) {
    return toProjectNotFound(error)
  }
}

export function toProjectNotFound(error: unknown): NextResponse {
  if (error instanceof ProjectForbidden) {
    return NextResponse.json({ error: API_ERROR.PROJECT_NOT_FOUND }, { status: HttpStatus.NOT_FOUND })
  }
  throw error
}
