import { NextResponse } from 'next/server'
import { requireAuthedSession } from '@/app/api/world/_lib/require-authed-session'
import { listAssetsQuerySchema } from '@/domains/2d-canvas/core/io/world.dto'
import { worldAssetService } from '@/domains/2d-canvas/services/world-data-service'
import { WORLD_QUERY_PARAM } from '@/domains/2d-canvas/constants/world-query-params'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { projectScope } from '@/shared/auth/project-scope'
import { toProjectNotFound } from '@/app/api/world/_lib/project-scope-response'

export async function GET(req: Request) {
  const { session, error } = await requireAuthedSession()
  if (error || !session) {
    return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const { projectId } = listAssetsQuerySchema.parse({
    projectId: searchParams.get(WORLD_QUERY_PARAM.PROJECT_ID),
  })

  const scope = await projectScope(projectId, session.user.id).catch(toProjectNotFound)
  if (scope instanceof NextResponse) return scope

  const assets = await worldAssetService.listForProject(scope)
  return NextResponse.json(assets)
}
