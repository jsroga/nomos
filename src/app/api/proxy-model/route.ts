import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
    }

    // Basic SSRF protection - only allow specific domains
    const parsedUrl = new URL(url)
    const allowedDomains = [
      'assets.meshy.ai',
      'cdn.meshy.ai',
      'storage.googleapis.com',
      'supabase.co',
    ]
    
    const isAllowed = allowedDomains.some(domain => parsedUrl.hostname.endsWith(domain))
    if (!isAllowed) {
      return NextResponse.json({ error: 'URL domain not allowed' }, { status: 403 })
    }

    const response = await fetch(url)

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch model: ${response.status}` },
        { status: response.status }
      )
    }

    const buffer = await response.arrayBuffer()

    let contentType = 'application/octet-stream'
    if (url.includes('.glb')) contentType = 'model/gltf-binary'
    else if (url.includes('.fbx')) contentType = 'application/octet-stream'
    else if (url.includes('.obj')) contentType = 'text/plain'
    else if (url.includes('.usdz')) contentType = 'model/vnd.usdz+zip'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error: any) {
    console.error('Proxy error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
