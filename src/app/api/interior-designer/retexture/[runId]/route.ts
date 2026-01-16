import { runs } from '@trigger.dev/sdk/v3'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await params

    if (!runId) {
      return NextResponse.json({ error: 'Missing runId' }, { status: 400 })
    }

    const run = await runs.retrieve(runId)

    // We want to return the status and the output if finished
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
