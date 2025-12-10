import { NextResponse } from 'next/server'
import { runs } from '@trigger.dev/sdk/v3'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const runId = searchParams.get('runId')

        if (!runId) {
            return NextResponse.json({ error: 'Missing runId parameter' }, { status: 400 })
        }

        // Retrieve run status using Trigger.dev SDK v3
        const run = await runs.retrieve(runId)

        if (!run) {
            return NextResponse.json({ error: 'Run not found' }, { status: 404 })
        }

        return NextResponse.json({
            id: run.id,
            status: run.status,
            output: run.output,
            error: run.error,
            metadata: run.metadata,
            createdAt: run.createdAt,
            updatedAt: run.updatedAt,
            startedAt: run.startedAt,
            finishedAt: run.finishedAt,
        })
    } catch (error: any) {
        console.error('Failed to get moodboard generation status:', error)

        // Handle specific Trigger.dev errors
        if (error.message?.includes('not found') || error.status === 404) {
            return NextResponse.json({ error: 'Run not found' }, { status: 404 })
        }

        return NextResponse.json(
            { error: error.message || 'Failed to get status' },
            { status: 500 }
        )
    }
}
