import { tasks } from '@trigger.dev/sdk/v3'
import { NextRequest, NextResponse } from 'next/server'
import type { textTo3DTask } from '@/trigger/text-to-3d'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      projectId,
      prompt,
      seed,
      apiKey,
      artStyle,
      enablePbr,
      targetPolycount,
      topology,
    } = body

    if (!projectId || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId and prompt' },
        { status: 400 }
      )
    }

    // Use provided API key or fall back to server env
    const meshyApiKey = apiKey || process.env.MESHY_API_KEY
    if (!meshyApiKey) {
      return NextResponse.json(
        { error: 'Meshy API key not configured' },
        { status: 400 }
      )
    }

    // Trigger the task
    const handle = await tasks.trigger<typeof textTo3DTask>('text-to-3d', {
      projectId,
      prompt,
      seed: seed || Math.floor(Math.random() * 2147483647),
      apiKey: meshyApiKey,
      artStyle: artStyle || 'realistic',
      enablePbr: enablePbr !== false,
      targetPolycount: targetPolycount || 30000,
      topology: topology || 'triangle',
    }, {
      ttl: '1h', // Match maxDuration
    })

    return NextResponse.json({
      success: true,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    })
  } catch (error: any) {
    console.error('Failed to trigger text-to-3d:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
