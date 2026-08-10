import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import { projects } from '@/db'
import { requireAuth } from '@/shared/auth/auth'
import { eq } from 'drizzle-orm'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'

export async function POST(req: Request) {
  try {
    const { session, error } = await requireAuth()
    if (error || !session) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
    }

    const body = await req.json()
    const { name, description, seriesBible } = body

    const [newProject] = await db
      .insert(projects)
      .values({
        userId: session.user.id,
        name,
        description,
        seriesBible: seriesBible || {},
      })
      .returning()

    return NextResponse.json(newProject)
  } catch (error) {
    console.error(API_LOG_PREFIX.CREATE_PROJECT_ERROR, error)
    return NextResponse.json({ error: API_ERROR.FAILED_CREATE_PROJECT }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { session, error } = await requireAuth()
    if (error || !session) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
    }

    const allProjects = await db.select().from(projects).where(eq(projects.userId, session.user.id))

    return NextResponse.json(allProjects)
  } catch (error) {
    console.error(API_LOG_PREFIX.FETCH_PROJECTS_ERROR, error)
    return NextResponse.json({ error: API_ERROR.FAILED_FETCH_PROJECTS }, { status: 500 })
  }
}
