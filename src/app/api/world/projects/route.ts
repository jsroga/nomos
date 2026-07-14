import { NextResponse } from 'next/server'
import { requireAuth } from '@/shared/auth'
import { createProjectRequestSchema } from '@/domains/world-building-toolkit/io/world.dto'
import { worldProjectService } from '@/domains/world-building-toolkit/services/WorldDataService'
import { WORLD_QUERY_PARAM } from '@/domains/world-building-toolkit/constants/world-query-params'
import { API_ERROR } from '@/shared/data/constants/api-errors'

export async function GET() {
  const { session, error } = await requireAuth()
  if (error || !session) {
    return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
  }

  const projects = await worldProjectService.listForUser(session.user.id)
  return NextResponse.json(projects)
}

export async function POST(req: Request) {
  const { session, error } = await requireAuth()
  if (error || !session) {
    return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
  }

  const body = createProjectRequestSchema.parse(await req.json())
  const project = await worldProjectService.create(session.user.id, body)
  return NextResponse.json(project)
}

export async function DELETE(req: Request) {
  const { session, error } = await requireAuth()
  if (error || !session) {
    return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get(WORLD_QUERY_PARAM.PROJECT_ID)
  if (!projectId) {
    return NextResponse.json({ error: API_ERROR.PROJECT_ID_REQUIRED_LOWER }, { status: 400 })
  }

  await worldProjectService.deleteForUser(session.user.id, projectId)
  return NextResponse.json({ success: true as const })
}
