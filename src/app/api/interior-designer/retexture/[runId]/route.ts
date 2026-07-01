import { runs } from '@trigger.dev/sdk/v3'
import { NextRequest, NextResponse } from 'next/server'
import { interiorDesignerJobStatusSchema } from '@/domains/interior-designer/io/interior-designer.dto'
import { requireAuth } from '@/lib/auth'
import { getErrorMessage } from '@/lib/error-utils'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { runId } = await params

    if (!runId) {
      return NextResponse.json({ error: 'Missing runId' }, { status: 400 })
    }

    const run = await runs.retrieve(runId)

    return NextResponse.json(interiorDesignerJobStatusSchema.parse({
      status: run.status,
      output: run.output,
      error: run.error,
      metadata: run.metadata,
    }))
  } catch (error: unknown) {
    console.error('Failed to get run status:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
