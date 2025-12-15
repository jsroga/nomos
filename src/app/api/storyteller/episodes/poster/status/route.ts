
import { NextResponse } from 'next/server'
import { runs } from "@trigger.dev/sdk/v3"

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const runId = searchParams.get('runId')

    if (!runId) {
        return NextResponse.json({ error: 'Missing runId' }, { status: 400 })
    }

    try {
        const run = await runs.retrieve(runId)

        if (!run) {
            return NextResponse.json({ status: 'NOT_FOUND' }, { status: 404 })
        }

        return NextResponse.json({
            status: run.status,
            output: run.output,
            error: run.error
        })

    } catch (error) {
        console.error('Error fetching task status:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
