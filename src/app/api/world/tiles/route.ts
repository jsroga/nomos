import { NextResponse } from 'next/server'
import { requireAuth } from '@/shared/auth'
import {
  deleteTileRequestSchema,
  listTilesQuerySchema,
  upsertTileRequestSchema,
} from '@/domains/world-building-toolkit/io/world.dto'
import { worldTileService } from '@/domains/world-building-toolkit/services/WorldDataService'

export async function GET(req: Request) {
  const { session, error } = await requireAuth()
  if (error || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const { projectId } = listTilesQuerySchema.parse({
    projectId: searchParams.get('projectId'),
  })

  const tiles = await worldTileService.listForProject(projectId)
  return NextResponse.json(tiles)
}

export async function POST(req: Request) {
  const { session, error } = await requireAuth()
  if (error || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = upsertTileRequestSchema.parse(await req.json())
  const tile = await worldTileService.upsert(body)
  return NextResponse.json(tile)
}

export async function DELETE(req: Request) {
  const { session, error } = await requireAuth()
  if (error || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = deleteTileRequestSchema.parse(await req.json())
  await worldTileService.remove(body)
  return NextResponse.json({ success: true as const })
}
