import { runs } from '@trigger.dev/sdk/v3'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params

    if (!taskId) {
      return NextResponse.json({ error: 'Missing taskId' }, { status: 400 })
    }

    const run = await runs.retrieve(taskId)

    // Return status and output if finished
    return NextResponse.json({
      status: run.status,
      output: run.output,
      error: run.error,
      metadata: run.metadata,
    })
  } catch (error: any) {
    console.error('Failed to get surface-material run status:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
