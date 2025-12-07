import { NextResponse } from 'next/server'
import { tasks } from '@trigger.dev/sdk/v3'
import type { remesh3DModelTask } from '@/trigger/remesh-3d-model'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const payload = await request.json()

    if (!payload.assetId || !payload.meshyTaskId || !payload.apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields: assetId, meshyTaskId, apiKey' },
        { status: 400 }
      )
    }

    const handle = await tasks.trigger<typeof remesh3DModelTask>('remesh-3d-model', payload, {
      ttl: '30m', // Match maxDuration
    })

    return NextResponse.json({
      success: true,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    })
  } catch (error: any) {
    console.error('Failed to trigger 3D remesh:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

