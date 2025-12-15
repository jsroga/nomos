import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { episodes } from '@/domains/storyteller/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(req: Request, props: { params: Promise<{ episodeId: string }> }) {
    const params = await props.params;
    try {
        const { episodeId } = params
        const body = await req.json()

        const [updatedEpisode] = await db
            .update(episodes)
            .set(body)
            .where(eq(episodes.id, episodeId))
            .returning()

        return NextResponse.json(updatedEpisode)
    } catch (error) {
        console.error('Error updating episode:', error)
        return NextResponse.json({ error: 'Failed to update episode' }, { status: 500 })
    }
}

export async function DELETE(req: Request, props: { params: Promise<{ episodeId: string }> }) {
    const params = await props.params;
    try {
        const { episodeId } = params
        await db.delete(episodes).where(eq(episodes.id, episodeId))
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting episode:', error)
        return NextResponse.json({ error: 'Failed to delete episode' }, { status: 500 })
    }
}
