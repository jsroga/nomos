import { tasks } from '@trigger.dev/sdk/v3'
import { NextRequest, NextResponse } from 'next/server'
import type { surfaceMaterialTask } from '@/trigger/surface-material'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, surfaceId, prompt, apiKey, artStyle, surfaceBounds } = body

    if (!projectId || !surfaceId || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, surfaceId, and prompt' },
        { status: 400 }
      )
    }

    // Use provided API key or fall back to server env
    const meshyApiKey = apiKey || process.env.MESHY_API_KEY
    if (!meshyApiKey) {
      return NextResponse.json({ error: 'Meshy API key not configured' }, { status: 400 })
    }

    // Trigger the task
    const handle = await tasks.trigger<typeof surfaceMaterialTask>(
      'surface-material',
      {
        projectId,
        surfaceId,
        prompt,
        apiKey: meshyApiKey,
        artStyle: artStyle || 'realistic',
        surfaceBounds,
      },
      {
        ttl: '1h', // Match maxDuration
      }
    )

    return NextResponse.json({
      success: true,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    })
  } catch (error: any) {
    console.error('Failed to trigger surface-material:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
