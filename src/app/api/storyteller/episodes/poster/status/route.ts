import { NextRequest, NextResponse } from 'next/server'
import { runs } from '@trigger.dev/sdk/v3'
import { requireAuth } from '@/shared/auth/auth'

export async function GET(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const runId = searchParams.get('runId')

    if (!runId) {
      return NextResponse.json({ error: 'Missing runId' }, { status: 400 })
    }

    const run = await runs.retrieve(runId)

    if (!run) {
      return NextResponse.json({ status: 'NOT_FOUND' }, { status: 404 })
    }

    return NextResponse.json({
      status: run.status,
      output: run.output,
      error: run.error,
    })
  } catch (error) {
    console.error('Error fetching task status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
