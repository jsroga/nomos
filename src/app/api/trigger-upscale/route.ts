import { NextResponse } from 'next/server'
import { tasks } from '@trigger.dev/sdk/v3'
import type { upscaleTileTask } from '@/trigger/upscale-tile'
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
    if (!payload.tileId || !payload.projectId || !payload.imageBase64 || !payload.provider) {
      return NextResponse.json(
        { error: 'Missing required fields: tileId, projectId, imageBase64, provider' },
        { status: 400 }
      )
    }

    if (!payload.providerConfig?.apiKey) {
      return NextResponse.json({ error: 'Missing providerConfig.apiKey' }, { status: 400 })
    }

    // Gemini config is optional - only required if not skipping pre-upscale
    if (!payload.skipGeminiPreUpscale && !payload.geminiConfig?.apiKey) {
      return NextResponse.json(
        { error: 'Missing geminiConfig.apiKey - required unless skipGeminiPreUpscale is true' },
        { status: 400 }
      )
    }

    // Fetch project style references if not provided
    const styleReferenceUrls =
      payload.styleReferenceUrls || (await fetchProjectStyleRefs(payload.projectId))

    // Trigger the upscale task with style references
    const handle = await tasks.trigger<typeof upscaleTileTask>(
      'upscale-tile',
      {
        ...payload,
        styleReferenceUrls,
      },
      {
        ttl: '25m', // Slightly less than maxDuration to avoid race
      }
    )

    return NextResponse.json({
      success: true,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    })
  } catch (error: any) {
    console.error('Failed to trigger upscale task:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to trigger upscale task' },
      { status: 500 }
    )
  }
}
