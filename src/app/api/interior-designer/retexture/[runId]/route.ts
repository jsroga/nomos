import { runs } from '@trigger.dev/sdk/v3'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { runId } = await params

    if (!runId) {
      return NextResponse.json({ error: 'Missing runId' }, { status: 400 })
    }

    const run = await runs.retrieve(runId)

    return NextResponse.json({
      status: run.status,
      output: run.output,
      error: run.error,
    })
  } catch (error: any) {
    console.error('Failed to get run status:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
