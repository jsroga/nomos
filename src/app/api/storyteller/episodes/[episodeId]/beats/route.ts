import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { beats } from '@/domains/storyteller/db/schema'
import { eq, asc } from 'drizzle-orm'

export async function GET(req: Request, props: { params: Promise<{ episodeId: string }> }) {
    const params = await props.params;
    try {
        const { episodeId } = params
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
    const params = await props.params;
    try {
        const { episodeId } = params
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
