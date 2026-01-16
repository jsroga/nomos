import { NextResponse } from 'next/server'
import { runs } from '@trigger.dev/sdk/v3'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const runId = searchParams.get('runId')

    if (!runId) {
      return NextResponse.json({ error: 'Run ID is required' }, { status: 400 })
    }

    const run = await runs.retrieve(runId)

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    return NextResponse.json({
      status: run.status,
      output: run.output,
      error: run.error,
    })
  } catch (error) {
    console.error('Error fetching task status:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
