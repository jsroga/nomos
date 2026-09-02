/**
 * Route wrapper that hands the handler a verified `ProjectScope` instead of a
 * raw id, so a handler cannot proceed without the check having happened.
 *
 * An interim of the `defineRoute` wrapper (action 21): it composes the existing
 * `withAuth` rather than replacing the four auth helpers, so it can be adopted
 * one route at a time.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { withAuth, type AuthenticatedRequest, type RouteHandlerContext } from '@/shared/data/api-utils'
import { ProjectForbidden, projectScope, type ProjectScope } from '@/shared/auth/project-scope'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { HttpStatus } from '@/shared/data/constants/protocol'

export enum ProjectIdSource {
  Query = 'query',
  Body = 'body',
}

type ScopedHandler = (
  request: NextRequest,
  scope: ProjectScope,
  auth: AuthenticatedRequest,
  context: RouteHandlerContext
) => Promise<NextResponse>

/**
 * @param field where the project id lives — a query param name or a body key
 */
export function withProjectScope(
  source: ProjectIdSource,
  field: string,
  handler: ScopedHandler
) {
  return withAuth(async (request, auth, context) => {
    const projectId =
      source === ProjectIdSource.Query
        ? new URL(request.url).searchParams.get(field)
        : readBodyField(await safeJson(request), field)

    if (!projectId) {
      return NextResponse.json(
        { error: API_ERROR.PROJECT_ID_IS_REQUIRED },
        { status: HttpStatus.BAD_REQUEST }
      )
    }

    try {
      const scope = await projectScope(projectId, auth.session.user.id)
      return await handler(request, scope, auth, context)
    } catch (error) {
      // 404, not 403: a 403 confirms the project exists.
      if (error instanceof ProjectForbidden) {
        return NextResponse.json(
          { error: API_ERROR.PROJECT_NOT_FOUND },
          { status: HttpStatus.NOT_FOUND }
        )
      }
      throw error
    }
  })
}

async function safeJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.clone().json()
  } catch {
    return null
  }
}

function readBodyField(body: unknown, field: string): string | null {
  if (typeof body !== 'object' || body === null || !(field in body)) return null
  const value = Reflect.get(body, field)
  return typeof value === 'string' ? value : null
}
