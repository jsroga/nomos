import { NextResponse } from 'next/server'
import { tasks } from '@trigger.dev/sdk/v3'
import type { generateTileTask } from '@/trigger/generate-tile'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Helper to fetch project style references
async function fetchProjectStyleRefs(projectId: string): Promise<string[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data, error } = await supabase
      .from('projects')
      .select('style_reference_urls')
      .eq('id', projectId)
      .single()
    
    if (error || !data) return []
    return (data.style_reference_urls as string[]) || []
  } catch {
    return []
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()

    // Validate required fields
    if (!payload.projectId || payload.x === undefined || payload.y === undefined || !payload.prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, x, y, prompt' },
        { status: 400 }
      )
    }

    if (!payload.aiProvider || !payload.aiConfig) {
      return NextResponse.json(
        { error: 'Missing required fields: aiProvider, aiConfig' },
        { status: 400 }
      )
    }

    // Determine if this is a first tile (no neighbors) or follow-up tile
    const isFirstTile = payload.isFirstTile ?? true

    // For first tile: fetch style references if not provided
    // For follow-up tiles: style refs not needed (context image provides style)
    const styleReferenceUrls = isFirstTile
      ? (payload.styleReferenceUrls || await fetchProjectStyleRefs(payload.projectId))
      : undefined

    // Trigger the tile generation task
    const handle = await tasks.trigger<typeof generateTileTask>('generate-tile', {
      projectId: payload.projectId,
      x: payload.x,
      y: payload.y,
      prompt: payload.prompt,
      aiProvider: payload.aiProvider,
      aiConfig: payload.aiConfig,
      isFirstTile,
      // Only pass style refs for first tile
      ...(styleReferenceUrls ? { styleReferenceUrls } : {}),
      // Pass context image for follow-up tiles
      ...(payload.contextImageBase64 ? { contextImageBase64: payload.contextImageBase64 } : {}),
    }, {
      ttl: '10m', // Match maxDuration
    })

    return NextResponse.json({
      success: true,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    })
  } catch (error: any) {
    console.error('Failed to trigger tile generation:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to trigger tile generation' },
      { status: 500 }
    )
  }
}
