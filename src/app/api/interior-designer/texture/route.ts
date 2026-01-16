import { NextRequest, NextResponse } from 'next/server'
import { textureService } from '@/domains/interior-designer/ai/TextureService'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { prompt, apiKey, style, useSemanticSearch, width, height } = body

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is required' }, { status: 401 })
    }

    const dims = { width: width || 1024, height: height || 1024 }
    const imageUrl = await textureService.generateTexture(
      prompt,
      apiKey,
      style || 'painterly',
      useSemanticSearch,
      dims
    )

    return NextResponse.json({ imageUrl })
  } catch (error: any) {
    console.error('Error generating texture:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate texture' },
      { status: 500 }
    )
  }
}
