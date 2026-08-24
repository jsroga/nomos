import { NextResponse } from 'next/server'
import { requireAuthedSession } from '@/app/api/world/_lib/require-authed-session'
import {
  deleteTileRequestSchema,
  listTilesQuerySchema,
  upsertTileRequestSchema,
} from '@/domains/2d-canvas/core/io/world.dto'
import { worldTileService } from '@/domains/2d-canvas/services/world-data-service'
import { WORLD_QUERY_PARAM } from '@/domains/2d-canvas/constants/world-query-params'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { ProjectForbidden, projectScope } from '@/shared/auth/project-scope'
import { HttpStatus } from '@/shared/data/constants/protocol'

export async function GET(req: Request) {
  const { session, error } = await requireAuthedSession()
  if (error || !session) {
    return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const { projectId } = listTilesQuerySchema.parse({
    projectId: searchParams.get(WORLD_QUERY_PARAM.PROJECT_ID),
  })

  const scope = await projectScope(projectId, session.user.id).catch(toForbidden)
  if (scope instanceof NextResponse) return scope

  const tiles = await worldTileService.listForProject(scope)
  return NextResponse.json(tiles)
}

export async function POST(req: Request) {
  const { session, error } = await requireAuthedSession()
  if (error || !session) {
    return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
  }

  const body = upsertTileRequestSchema.parse(await req.json())
  const tile = await worldTileService.upsert(body)
  return NextResponse.json(tile)
}

export async function DELETE(req: Request) {
  const { session, error } = await requireAuthedSession()
  if (error || !session) {
    return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
  }

  const body = deleteTileRequestSchema.parse(await req.json())
  await worldTileService.remove(body)
  return NextResponse.json({ success: true as const })
}

/** ProjectForbidden → 404; a 403 would confirm the project exists. */
function toForbidden(error: unknown): NextResponse {
  if (error instanceof ProjectForbidden) {
    return NextResponse.json({ error: API_ERROR.PROJECT_NOT_FOUND }, { status: HttpStatus.NOT_FOUND })
  }
  throw error
}
