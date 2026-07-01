import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { beats, episodes, projects } from '@/domains/storyteller'
import { eq, asc } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

async function verifyEpisodeAccess(episodeId: string, userId: string) {
  const [episode] = await db.select().from(episodes).where(eq(episodes.id, episodeId))
  if (!episode) return false

  const [project] = await db.select().from(projects).where(eq(projects.id, episode.projectId))
  if (!project || project.userId !== userId) return false

  return true
}

export async function GET(req: Request, props: { params: Promise<{ episodeId: string }> }) {
  const params = await props.params
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { episodeId } = params

    if (!(await verifyEpisodeAccess(episodeId, session.user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const episodeBeats = await db
      .select()
      .from(beats)
      .where(eq(beats.episodeId, episodeId))
      .orderBy(asc(beats.sequence))

    return NextResponse.json(episodeBeats)
  } catch (error) {
    console.error('Error fetching beats:', error)
    return NextResponse.json({ error: 'Failed to fetch beats' }, { status: 500 })
  }
}

export async function POST(req: Request, props: { params: Promise<{ episodeId: string }> }) {
  const params = await props.params
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { episodeId } = params

    if (!(await verifyEpisodeAccess(episodeId, session.user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const { logline, beatType, sequence, content, visualHook } = body

    const [newBeat] = await db
      .insert(beats)
      .values({
        episodeId,
        logline,
        beatType,
        sequence,
        content,
        visualHook,
        status: 'proposed',
      })
      .returning()

    return NextResponse.json(newBeat)
  } catch (error) {
    console.error('Error creating beat:', error)
    return NextResponse.json({ error: 'Failed to create beat' }, { status: 500 })
  }
}
