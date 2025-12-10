import { NextResponse } from 'next/server'
import { tasks } from '@trigger.dev/sdk/v3'
import type { enhanceFidelityTask } from '@/trigger/enhance-fidelity'
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

    if (!payload.tileId || !payload.projectId || !payload.imageBase64 || !payload.stylePrompt) {
      return NextResponse.json(
        { error: 'Missing required fields: tileId, projectId, imageBase64, stylePrompt' },
        { status: 400 }
      )
    }

    if (!payload.geminiConfig?.apiKey) {
      return NextResponse.json(
        { error: 'Missing geminiConfig.apiKey - Gemini is required for fidelity enhancement' },
        { status: 400 }
      )
    }

    // Fetch project style references if not provided
    const styleReferenceUrls = payload.styleReferenceUrls || await fetchProjectStyleRefs(payload.projectId)

    const handle = await tasks.trigger<typeof enhanceFidelityTask>('enhance-fidelity', {
      ...payload,
      creativity: payload.creativity || 0.3,
      styleReferenceUrls,
    }, {
      ttl: '10m',
    })

    return NextResponse.json({
      success: true,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    })
  } catch (error: any) {
    console.error('Failed to trigger fidelity enhancement:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to trigger fidelity enhancement' },
      { status: 500 }
    )
  }
}



