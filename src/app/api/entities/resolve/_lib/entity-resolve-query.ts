import { NextRequest, NextResponse } from 'next/server'
import { verifyProjectAccess } from '@/domains/storyteller/server'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import {
  BooleanQueryValue,
  HttpStatus,
  QueryParam,
} from '@/shared/data/constants/protocol'

const MAX_ENTITY_IDS = 50
const VALID_ID_PATTERN = /^[a-z0-9-_.'’]+$/i

export interface EntityResolveQuery {
  projectId: string
  ids: string[]
  enrichRelationships: boolean
  context: string | null
}

type EntityResolveQueryResult =
  | { ok: true; query: EntityResolveQuery }
  | { ok: false; response: NextResponse }

function parseEntityIds(idsParam: string): string[] {
  return idsParam
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0)
    .slice(0, MAX_ENTITY_IDS)
}

function findInvalidEntityIds(ids: string[]): string[] {
  const invalidIds: string[] = []
  for (const id of ids) {
    if (!VALID_ID_PATTERN.test(id)) invalidIds.push(id)
  }
  return invalidIds
}

export async function parseEntityResolveQuery(
  request: NextRequest
): Promise<EntityResolveQueryResult> {
  const { requireAuth } = await import('@/shared/auth/auth')
  const { session } = await requireAuth()
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED }),
    }
  }

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get(QueryParam.ProjectId)
  const idsParam = searchParams.get(QueryParam.Ids)
  const enrichRelationships =
    searchParams.get(QueryParam.EnrichRelationships) === BooleanQueryValue.True
  const context = searchParams.get(QueryParam.Context)

  if (!projectId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: API_ERROR.MISSING_PROJECT_ID },
        { status: HttpStatus.BAD_REQUEST }
      ),
    }
  }

  if (!(await verifyProjectAccess(projectId, session.user.id))) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: API_ERROR.PROJECT_ACCESS_DENIED },
        { status: HttpStatus.FORBIDDEN }
      ),
    }
  }

  if (!idsParam) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: API_ERROR.MISSING_IDS_PARAMETER },
        { status: HttpStatus.BAD_REQUEST }
      ),
    }
  }

  const ids = parseEntityIds(idsParam)
  const invalidIds = findInvalidEntityIds(ids)
  if (invalidIds.length > 0) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: API_ERROR.INVALID_ENTITY_IDS_FORMAT, invalidIds },
        { status: HttpStatus.BAD_REQUEST }
      ),
    }
  }

  if (ids.length === 0) {
    return {
      ok: false,
      response: NextResponse.json({ entities: [] }),
    }
  }

  return {
    ok: true,
    query: {
      projectId,
      ids,
      enrichRelationships,
      context,
    },
  }
}
