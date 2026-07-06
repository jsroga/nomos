import { NextRequest, NextResponse } from 'next/server'
import { runs } from '@trigger.dev/sdk/v3'
import { requireAuth } from '@/shared/auth/auth'
import { getErrorMessage } from '@/shared/errors/error-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  let runId: string | null = null
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    runId = searchParams.get('runId')

    if (!runId) {
      return NextResponse.json({ error: 'Missing runId parameter' }, { status: 400 })
    }

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
  } catch (error: unknown) {
    console.error('Failed to get moodboard generation status:', error)

    return NextResponse.json({ error: getErrorMessage(error) || 'Failed to get status' }, { status: 500 })
  }
}
