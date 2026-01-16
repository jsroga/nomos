import { retextureModelTask } from '@/trigger/retexture-model' // Verify import path
import { tasks } from '@trigger.dev/sdk/v3'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Helper to fetch project style references
async function fetchProjectStyleRefs(projectId: string): Promise<string[]> {
  console.log(`[Retexture API] Fetching style refs for project: ${projectId}`)

  try {
    if (projectId === 'default') {
      console.log('[Retexture API] Skipping style lookup - projectId is \'default\'')
      return []
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase
      .from('projects')
      .select('style_reference_urls')
      .eq('id', projectId)
      .single()

    if (error) {
      console.warn('[Retexture API] DB error fetching style refs:', error.message)
      return []
    }

    if (!data) {
      console.warn(`[Retexture API] No project found with id: ${projectId}`)
      return []
    }

    const urls = (data.style_reference_urls as string[]) || []
    console.log(`[Retexture API] Found ${urls.length} style reference URL(s):`, urls)
    return urls
  } catch (e) {
    console.error('[Retexture API] Exception fetching style refs:', e)
    return []
  }
}

// Helper to validate URL is publicly accessible (Meshy needs to download it)
async function validatePublicUrl(url: string): Promise<boolean> {
  try {
    // Only validate http/https URLs
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return false
    }

    // HEAD request to check accessibility without downloading full image
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })

    return response.ok
  } catch (err) {
    console.warn('[Retexture API] Style URL validation failed:', err)
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const { modelUrlOrBase64, prompt, assetId, projectId, apiKey } = await req.json()

    if (!modelUrlOrBase64 || !prompt || !projectId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch style reference URLs from project settings (pick first if multiple)
    const styleReferenceUrls = await fetchProjectStyleRefs(projectId)
    let styleImageUrl: string | undefined = undefined

    // Validate the first available style URL is publicly accessible
    if (styleReferenceUrls.length > 0) {
      const candidateUrl = styleReferenceUrls[0]
      const isAccessible = await validatePublicUrl(candidateUrl)

      if (isAccessible) {
        styleImageUrl = candidateUrl
        console.log(`[Retexture API] Using style reference: ${styleImageUrl}`)
      } else {
        console.warn(`[Retexture API] Style reference not accessible, skipping: ${candidateUrl}`)
      }
    }

    // Trigger the task
    const handle = await tasks.trigger<typeof retextureModelTask>('retexture-model', {
      modelBase64: modelUrlOrBase64,
      prompt,
      assetId: assetId || 'temp-asset',
      projectId,
      apiKey: apiKey || process.env.MESHY_API_KEY, // Allow client to pass key or use server env
      styleImageUrl, // Pass style reference to Meshy (undefined if not accessible)
    })

    return NextResponse.json({ runId: handle.id })
  } catch (error: any) {
    console.error('Failed to trigger retexture:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
