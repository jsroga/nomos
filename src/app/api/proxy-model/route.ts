import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  try {
    const response = await fetch(url)

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch model: ${response.status}` },
        { status: response.status }
      )
    }

    const buffer = await response.arrayBuffer()

    // Determine content type based on URL
    let contentType = 'application/octet-stream'
    if (url.includes('.glb')) contentType = 'model/gltf-binary'
    else if (url.includes('.fbx')) contentType = 'application/octet-stream'
    else if (url.includes('.obj')) contentType = 'text/plain'
    else if (url.includes('.usdz')) contentType = 'model/vnd.usdz+zip'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400', // Cache for 24h
      },
    })
  } catch (error: any) {
    console.error('Proxy error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
