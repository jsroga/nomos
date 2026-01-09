import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { beats, episodes, projects } from '@/domains/storyteller/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

async function verifyBeatAccess(beatId: string, userId: string) {
  // Join not supported directly in simple query easily, so simple lookup chain for now
  // Beat -> Episode -> Project
  const [beat] = await db.select().from(beats).where(eq(beats.id, beatId))
  if (!beat) return false

  const [episode] = await db.select().from(episodes).where(eq(episodes.id, beat.episodeId))
  if (!episode) return false

  const [project] = await db.select().from(projects).where(eq(projects.id, episode.projectId))
  if (!project || project.userId !== userId) return false

  return true
}

export async function PATCH(req: Request, props: { params: Promise<{ beatId: string }> }) {
  const params = await props.params;
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { beatId } = params

    if (!(await verifyBeatAccess(beatId, session.user.id))) {
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
  const params = await props.params;
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { beatId } = params

    if (!(await verifyBeatAccess(beatId, session.user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await db.delete(beats).where(eq(beats.id, beatId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting beat:', error)
    return NextResponse.json({ error: 'Failed to delete beat' }, { status: 500 })
  }
}
