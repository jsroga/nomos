import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { beats, episodes, projects } from '@/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

/**
 * Verify beat access using a single JOIN query instead of 3 sequential queries
 * Returns { hasAccess, projectId, episodeId } for potential reuse
 */
async function verifyBeatAccess(
  beatId: string,
  userId: string
): Promise<{
  hasAccess: boolean
  projectId?: string
  episodeId?: string
}> {
  // Single query with JOINs: beat -> episode -> project
  const result = await db
    .select({
      beatId: beats.id,
      episodeId: episodes.id,
      projectId: projects.id,
      projectUserId: projects.userId,
    })
    .from(beats)
    .innerJoin(episodes, eq(beats.episodeId, episodes.id))
    .innerJoin(projects, eq(episodes.projectId, projects.id))
    .where(eq(beats.id, beatId))
    .limit(1)

  if (result.length === 0) {
    return { hasAccess: false }
  }

  const row = result[0]
  if (row.projectUserId !== userId) {
    return { hasAccess: false }
  }

  return {
    hasAccess: true,
    projectId: row.projectId,
    episodeId: row.episodeId,
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ beatId: string }> }) {
  const params = await props.params
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { beatId } = params
    const { hasAccess } = await verifyBeatAccess(beatId, session.user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()

    const [updatedBeat] = await db.update(beats).set(body).where(eq(beats.id, beatId)).returning()

    return NextResponse.json(updatedBeat)
  } catch (error) {
    console.error('Error updating beat:', error)
    return NextResponse.json({ error: 'Failed to update beat' }, { status: 500 })
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ beatId: string }> }) {
  const params = await props.params
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { beatId } = params
    const { hasAccess } = await verifyBeatAccess(beatId, session.user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await db.delete(beats).where(eq(beats.id, beatId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting beat:', error)
    return NextResponse.json({ error: 'Failed to delete beat' }, { status: 500 })
  }
}
