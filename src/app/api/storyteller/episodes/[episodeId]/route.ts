import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { episodes } from '@/domains/storyteller/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(req: Request, props: { params: Promise<{ episodeId: string }> }) {
  const params = await props.params
  try {
    const { episodeId } = params
    const episode = await db.query.episodes.findFirst({
      where: eq(episodes.id, episodeId),
    })

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
    }

    return NextResponse.json(episode)
  } catch (error) {
    console.error('Error fetching episode:', error)
    return NextResponse.json({ error: 'Failed to fetch episode' }, { status: 500 })
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ episodeId: string }> }) {
  const params = await props.params
  try {
    const { episodeId } = params
    const body = await req.json()
    const { posterUrl, storyboardUrl, ...rest } = body

    // Start with whatever is in rest
    const updateData: any = { ...rest }

    // Explicitly map posterUrl to match schema key (though usually same)
    if (posterUrl) {
      updateData.posterUrl = posterUrl
    }

    // If storyboardUrl is provided, we need to save it into the storyPlan JSONB
    // because there is no top-level column for it yet.
    if (storyboardUrl) {
      const currentEpisode = await db.query.episodes.findFirst({
        where: eq(episodes.id, episodeId),
      })

      if (currentEpisode) {
        const currentPlan = (currentEpisode.storyPlan as any) || {}
        updateData.storyPlan = {
          ...currentPlan,
          storyboardUrl,
        }
      }
    }

    // Ensure we actually have something to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'No updates provided' })
    }

    const [updatedEpisode] = await db
      .update(episodes)
      .set(updateData)
      .where(eq(episodes.id, episodeId))
      .returning()

    return NextResponse.json(updatedEpisode)
  } catch (error) {
    console.error('Error updating episode:', error)
    return NextResponse.json({ error: 'Failed to update episode' }, { status: 500 })
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ episodeId: string }> }) {
  const params = await props.params
  try {
    const { episodeId } = params
    await db.delete(episodes).where(eq(episodes.id, episodeId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting episode:', error)
    return NextResponse.json({ error: 'Failed to delete episode' }, { status: 500 })
  }
}
