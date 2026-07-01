import { NextRequest, NextResponse } from 'next/server'
import { textureService } from '@/domains/interior-designer/ai/TextureService'
import {
  textureGenerationRequestSchema,
  textureGenerationResponseSchema,
} from '@/domains/interior-designer/io/interior-designer.dto'
import { withAuth, withRateLimit } from '@/lib/api-utils'

export const POST = withRateLimit(
  withAuth<Record<string, unknown>>(async (request: NextRequest) => {
    const parsedBody = textureGenerationRequestSchema.safeParse(await request.json())
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid texture generation payload' }, { status: 400 })
    }

    const { prompt, apiKey, style, useSemanticSearch, width, height } = parsedBody.data

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

    return NextResponse.json(textureGenerationResponseSchema.parse({ imageUrl }))
  }),
  { maxRequests: 20, windowMs: 60000 }
)
