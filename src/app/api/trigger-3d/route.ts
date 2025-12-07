import { NextResponse } from 'next/server'
import { tasks } from '@trigger.dev/sdk/v3'
import type { generate3DModelTask } from '@/trigger/generate-3d-model'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const payload = await request.json()

    const handle = await tasks.trigger<typeof generate3DModelTask>('generate-3d-model', payload, {
      ttl: '30m', // Match maxDuration - don't expire before it can complete
    })

    return NextResponse.json({
      success: true,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    })
  } catch (error: any) {
    console.error('Failed to trigger 3D generation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
