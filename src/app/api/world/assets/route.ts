import { NextResponse } from 'next/server'
import { requireAuth } from '@/shared/auth'
import { listAssetsQuerySchema } from '@/domains/2d-canvas/core/io/world.dto'
import { worldAssetService } from '@/domains/2d-canvas/services/world-data-service'
import { WORLD_QUERY_PARAM } from '@/domains/2d-canvas/constants/world-query-params'
import { API_ERROR } from '@/shared/data/constants/api-errors'

export async function GET(req: Request) {
  const { session, error } = await requireAuth()
  if (error || !session) {
    return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const { projectId } = listAssetsQuerySchema.parse({
    projectId: searchParams.get(WORLD_QUERY_PARAM.PROJECT_ID),
  })

  const assets = await worldAssetService.listForProject(projectId)
  return NextResponse.json(assets)
}
