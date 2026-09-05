import { NextResponse } from 'next/server'
import { requireAuthedSession } from '@/app/api/world/_lib/require-authed-session'
import {
  deleteTileRequestSchema,
  listTilesQuerySchema,
  upsertTileRequestSchema,
} from '@/domains/2d-canvas/core/io/world.dto'
import { WORLD_QUERY_PARAM, worldTileService } from '@/domains/2d-canvas/server'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { awaitProjectScope } from '@/app/api/world/_lib/project-scope-response'

export async function GET(req: Request) {
  const { session, error } = await requireAuthedSession()
  if (error || !session) {
    return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const { projectId } = listTilesQuerySchema.parse({
    projectId: searchParams.get(WORLD_QUERY_PARAM.PROJECT_ID),
  })

  const scope = await awaitProjectScope(projectId, session.user.id)
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
