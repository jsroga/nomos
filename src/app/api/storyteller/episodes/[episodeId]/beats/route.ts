import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import { beats, episodes, projects } from '@/db'
import { eq, asc } from 'drizzle-orm'
import { requireAuth } from '@/shared/auth/auth'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { StorytellerBeatStatus } from '@/domains/storyteller/core/storyteller-page-wire'

async function verifyEpisodeAccess(episodeId: string, userId: string) {
  const [episode] = await db.select().from(episodes).where(eq(episodes.id, episodeId))
  if (!episode) return false

  const [project] = await db.select().from(projects).where(eq(projects.id, episode.projectId))
  if (!project || project.userId !== userId) return false

  return true
}

export async function GET(_req: Request, props: { params: Promise<{ episodeId: string }> }) {
  const params = await props.params
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const { episodeId } = params

    if (!(await verifyEpisodeAccess(episodeId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 403 })
    }

    const episodeBeats = await db
      .select()
      .from(beats)
      .where(eq(beats.episodeId, episodeId))
      .orderBy(asc(beats.sequence))

    return NextResponse.json(episodeBeats)
  } catch (error) {
    console.error(API_LOG_PREFIX.FETCH_BEATS_ERROR, error)
    return NextResponse.json({ error: API_ERROR.FAILED_FETCH_BEATS }, { status: 500 })
  }
}

export async function POST(req: Request, props: { params: Promise<{ episodeId: string }> }) {
  const params = await props.params
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const { episodeId } = params

    if (!(await verifyEpisodeAccess(episodeId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 403 })
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
        status: StorytellerBeatStatus.Proposed,
      })
      .returning()

    return NextResponse.json(newBeat)
  } catch (error) {
    console.error(API_LOG_PREFIX.BEAT_CREATE_ERROR, error)
    return NextResponse.json({ error: API_ERROR.FAILED_CREATE_BEAT }, { status: 500 })
  }
}
