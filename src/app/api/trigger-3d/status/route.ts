import { NextResponse } from 'next/server'
import { runs } from '@trigger.dev/sdk/v3'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const runId = searchParams.get('runId')

  console.log(`[Proxy] Checking status for runId: ${runId}`)

  if (!runId) {
    console.log('[Proxy] Missing runId')
    return NextResponse.json({ error: 'Missing runId' }, { status: 400 })
  }

  try {
    // Use v3 SDK runs.retrieve which correctly queries the v3 API
    const run = await runs.retrieve(runId)

    console.log(`[Proxy] Run status: ${run.status}`)

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

    // If run not found or other error
    if (error.message?.includes('not found') || error.status === 404) {
      return NextResponse.json({ error: 'Run not found', status: 'NOT_FOUND' }, { status: 404 })
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
