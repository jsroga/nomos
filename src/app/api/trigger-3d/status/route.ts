import { NextRequest, NextResponse } from 'next/server'
import { runs } from '@trigger.dev/sdk/v3'
import { withAuth, type AuthenticatedRequest } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (request: NextRequest, { session }: AuthenticatedRequest) => {
  const { searchParams } = new URL(request.url)
  const runId = searchParams.get('runId')

  if (!runId) {
    return NextResponse.json({ error: 'Missing runId' }, { status: 400 })
  }

  try {
    const run = await runs.retrieve(runId)

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
    console.error('[Proxy] Error retrieving run:', error)

    if (error.message?.includes('not found') || error.status === 404) {
      return NextResponse.json({ error: 'Run not found', status: 'NOT_FOUND' }, { status: 404 })
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
