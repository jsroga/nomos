import { NextRequest, NextResponse } from 'next/server'
import { runs } from '@trigger.dev/sdk/v3'
import { withAuth, type AuthenticatedRequest } from '@/lib/api-utils'
import { getErrorMessage } from '@/lib/error-utils'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (request: NextRequest, { session }: AuthenticatedRequest) => {
  const { searchParams } = new URL(request.url)
  const runId = searchParams.get('runId')

  if (!runId) {
    return NextResponse.json({ error: 'Missing runId parameter' }, { status: 400 })
  }

  try {
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
    console.error('Failed to get fidelity status:', error)

    if (getErrorMessage(error)?.includes('not found') || error.status === 404) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    return NextResponse.json({ error: getErrorMessage(error) || 'Failed to get status' }, { status: 500 })
  }
})
