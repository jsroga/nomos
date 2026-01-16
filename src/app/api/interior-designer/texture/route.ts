import { NextRequest, NextResponse } from 'next/server'
import { textureService } from '@/domains/interior-designer/ai/TextureService'
import { withAuth, withRateLimit, type AuthenticatedRequest } from '@/lib/api-utils'

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session }: AuthenticatedRequest) => {
    const body = await request.json()
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
  }),
  { maxRequests: 20, windowMs: 60000 }
)
