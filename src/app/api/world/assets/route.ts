import { NextResponse } from 'next/server'
import { requireAuth } from '@/shared/auth'
import { listAssetsQuerySchema } from '@/domains/world-building-toolkit/io/world.dto'
import { worldAssetService } from '@/domains/world-building-toolkit/services/WorldDataService'

export async function GET(req: Request) {
  const { session, error } = await requireAuth()
  if (error || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const { projectId } = listAssetsQuerySchema.parse({
    projectId: searchParams.get('projectId'),
  })

  const assets = await worldAssetService.listForProject(projectId)
  return NextResponse.json(assets)
}
